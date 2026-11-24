import type { FigmaFile } from './figma-tab.js';

export type ExportResult = 'requested' | 'unavailable' | 'manual' | 'changed';

// WebExtensions serialize this function to run in the active tab. Keep its runtime dependencies inside it.
export async function requestFigmaExport(file: FigmaFile): Promise<ExportResult> {
  const labels = {
    main: /^(?:(?:figma )?main menu|(?:open )?figma menu|menu (?:principal|(?:do )?figma))$/,
    file: /^(?:file|arquivo)$/,
    save: /^(?:save (?:a )?local copy|salvar (?:uma )?copia local)$/,
    actions: /^(?:actions|quick actions|acoes|acoes rapidas)(?:\s*\([^)]*\))?$/,
    search: /^(?:search (?:for )?(?:quick )?actions|(?:buscar|pesquisar)(?: por)? acoes)$/,
  };
  const toolbar = 'button, [role="button"], [aria-haspopup="menu"]';
  const menu = '[role="menuitem"], [role="menu"] button';
  const saveCommand = '[data-testid="save-as"]';

  function onSameFile(): boolean {
    const { origin, pathname } = location;
    return origin === file.origin && (pathname === file.path || pathname.startsWith(`${file.path}/`));
  }

  function matchesLabel(label: string | null | undefined, pattern: RegExp): boolean {
    const normalized = label?.normalize('NFKD').replace(/\p{M}/gu, '')
      .replace(/\s+/g, ' ').trim().replace(/\.{3}$/, '').trim().toLowerCase();
    return normalized !== undefined && pattern.test(normalized);
  }

  function isVisible(element: HTMLElement): boolean {
    return element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible' &&
      !element.closest('[hidden], [inert], [aria-hidden="true"]');
  }

  function isDisabled(element: HTMLElement): boolean {
    return Boolean(element.closest(':disabled, [aria-disabled="true"], [data-disabled]:not([data-disabled="false"])'));
  }

  function findControl(selector: string, pattern?: RegExp): HTMLElement | undefined {
    return Array.from(document.querySelectorAll(selector)).find((element): element is HTMLElement => {
      if (!(element instanceof HTMLElement) || !isVisible(element)) return false;
      if (!pattern) return true;

      const labelledBy = element.getAttribute('aria-labelledby')?.split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent).join(' ');
      return [element.getAttribute('aria-label'), labelledBy, element.title, element.textContent,
        ...Array.from(element.children, (child) => child.textContent)]
        .some((label) => matchesLabel(label, pattern));
    });
  }

  function findSaveCommand(): HTMLElement | undefined {
    return findControl(saveCommand) ?? findControl(`${menu}, [role="option"]`, labels.save);
  }

  async function waitFor<T>(find: () => T | undefined, timeout: number): Promise<T | undefined> {
    const deadline = performance.now() + timeout;
    while (onSameFile()) {
      const value = find();
      if (value !== undefined || performance.now() >= deadline) return value;
      await new Promise<void>((resolve) => setTimeout(resolve, 75));
    }
  }

  function findMainMenu(): HTMLElement | undefined {
    return findControl('[data-testid="main-menu-trigger"], [data-testid="main-menu-button"], [data-testid="figma-menu-button"]') ??
      findControl(toolbar, labels.main) ?? findControl('[data-testid="main-menu"]');
  }

  function findActionSearch(): HTMLInputElement | undefined {
    const quickActions = '[data-testid*="quick-action"], [class*="quickActions"], [class*="quick_actions"], [class*="quick-actions"]';
    return Array.from(document.querySelectorAll('input')).find((input) =>
      isVisible(input) && ['text', 'search'].includes(input.type) && !input.readOnly && !isDisabled(input) && (
        matchesLabel(input.placeholder, labels.search) || matchesLabel(input.getAttribute('aria-label'), labels.search) ||
        Boolean(input.closest(quickActions))
      ),
    );
  }

  async function findThroughFileMenu(): Promise<HTMLElement | undefined> {
    const findFileMenu = () => findControl(menu, labels.file);
    if (!findFileMenu()) {
      const main = await waitFor(findMainMenu, 1000);
      if (!main || !onSameFile() || !main.isConnected || isDisabled(main)) return;
      if (main.getAttribute('aria-expanded') !== 'true') main.click();
    }

    const fileMenu = await waitFor(findFileMenu, 650);
    if (!fileMenu || !onSameFile() || !fileMenu.isConnected || isDisabled(fileMenu)) return;
    if (fileMenu.getAttribute('aria-expanded') !== 'true') {
      const key = getComputedStyle(fileMenu).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      fileMenu.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true }));
    }

    const command = await waitFor(findSaveCommand, 500);
    if (command || !onSameFile() || !fileMenu.isConnected) return command;
    if (fileMenu.getAttribute('aria-expanded') !== 'true') fileMenu.click();
    return waitFor(findSaveCommand, 850);
  }

  async function findThroughActions(): Promise<HTMLElement | undefined> {
    if (!onSameFile()) return;
    if (!findActionSearch()) {
      const actions = findControl(toolbar, labels.actions);
      if (actions && !isDisabled(actions)) {
        actions.click();
      } else {
        const active = document.activeElement;
        if (!document.querySelector('canvas') || active?.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')) return;

        const mac = navigator.platform.startsWith('Mac');
        (active ?? document).dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true, cancelable: true, key: '/', code: 'Slash', keyCode: 191, which: 191,
          ctrlKey: !mac, metaKey: mac,
        }));
      }
    }

    const input = await waitFor(findActionSearch, 750);
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!input || !setValue) return;

    const portuguese = [document.documentElement.lang, input.placeholder, input.getAttribute('aria-label')]
      .some((label) => label && (/^pt(?:-|$)/i.test(label) || /buscar|pesquisar/i.test(label)));
    const queries = portuguese ? ['salvar cópia local', 'save local copy'] : ['save local copy', 'salvar cópia local'];
    for (const query of queries) {
      if (!onSameFile() || !input.isConnected) return;
      setValue.call(input, query);
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      const command = await waitFor(findSaveCommand, 800);
      if (command) return command;
    }
  }

  if (!onSameFile()) return 'changed';
  const command = findSaveCommand() ?? await findThroughFileMenu() ?? await findThroughActions();
  if (!onSameFile()) return 'changed';
  if (!command || !command.isConnected || !isVisible(command)) return 'manual';
  if (isDisabled(command)) return 'unavailable';

  command.click();
  return 'requested';
}
