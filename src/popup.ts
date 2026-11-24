import { requestFigmaExport, type ExportResult } from './figma-export.js';
import { getFigmaFile, type FigmaFile } from './figma-tab.js';

declare const chrome: {
  i18n: { getMessage(key: string): string };
  tabs: {
    query(options: { active: true; currentWindow: true }): Promise<Array<{ id?: number; url?: string }>>;
  };
  scripting: {
    executeScript(options: {
      target: { tabId: number };
      func: typeof requestFigmaExport;
      args: [FigmaFile];
    }): Promise<Array<{ result?: ExportResult }>>;
  };
};
declare const browser: typeof chrome | undefined;

const extension = typeof browser === 'undefined' ? chrome : browser;

const button = document.querySelector<HTMLButtonElement>('#export')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const fallback = document.querySelector<HTMLParagraphElement>('#fallback')!;

const resultMessages: Record<ExportResult, string> = {
  requested: 'statusRequested',
  unavailable: 'statusUnavailable',
  manual: 'statusManual',
  changed: 'statusChanged',
};

const message = (key: string) => extension.i18n.getMessage(key);

document.documentElement.lang = message('languageTag');
for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
  const key = element.dataset.i18n;
  if (key) element.textContent = message(key);
}

async function initialize() {
  try {
    const [tab] = await extension.tabs.query({ active: true, currentWindow: true });
    const file = getFigmaFile(tab?.url);
    const tabId = tab?.id;
    if (tabId === undefined || !file) {
      status.textContent = message('statusOpenDesign');
      return;
    }

    status.textContent = '';
    button.disabled = false;
    button.addEventListener('click', async () => {
      button.disabled = true;
      fallback.hidden = true;
      status.textContent = message('statusSearching');

      try {
        const [execution] = await extension.scripting.executeScript({
          target: { tabId },
          func: requestFigmaExport,
          args: [file],
        });
        const result = execution?.result ?? 'manual';
        status.textContent = message(resultMessages[result]);
        fallback.hidden = result !== 'manual';
      } catch {
        status.textContent = message('statusExportError');
        fallback.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
  } catch {
    status.textContent = message('statusTabError');
  }
}

void initialize();
