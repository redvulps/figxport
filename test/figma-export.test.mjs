import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { requestFigmaExport } from '../dist/chromium/figma-export.js';

test('opens the File submenu with the Figma menu keyboard event', async () => {
  const events = [];
  let mainMenuOpen = false;
  let fileMenuOpen = false;

  class Control {
    constructor(label, onClick) {
      this.textContent = label;
      this.click = onClick;
      this.children = [];
      this.isConnected = true;
    }

    getClientRects() { return [{}]; }
    getAttribute() { return null; }
    closest() { return null; }

    dispatchEvent(event) {
      assert.equal(this.textContent, 'File');
      assert.equal(event.type, 'keydown');
      assert.equal(event.key, 'ArrowRight');
      assert.equal(event.bubbles, true);
      fileMenuOpen = true;
      events.push('open file submenu');
    }
  }

  const main = new Control('Main menu', () => {
    mainMenuOpen = true;
    events.push('open main menu');
  });
  const fileMenu = new Control('File', () => assert.fail('The Figma submenu opens via keyboard'));
  const save = new Control('Save local copy…', () => events.push('request native export'));

  const site = {
    HTMLElement: Control,
    getComputedStyle: () => ({ visibility: 'visible', direction: 'ltr' }),
    KeyboardEvent: class {
      constructor(type, init) { Object.assign(this, init, { type }); }
    },
    performance,
    setTimeout,
    location: new URL('https://www.figma.com/design/D3m0/Example'),
    document: {
      querySelectorAll(selector) {
        if (selector.includes('[data-testid="main-menu-trigger"]')) return [main];
        if (selector.includes('[role="menuitem"]') && mainMenuOpen) {
          return fileMenuOpen ? [fileMenu, save] : [fileMenu];
        }
        return [];
      },
    },
  };

  const injected = runInNewContext(`(${requestFigmaExport.toString()})`, site);
  assert.equal(await injected({ origin: site.location.origin, path: '/design/D3m0' }), 'requested');
  assert.deepEqual(events, ['open main menu', 'open file submenu', 'request native export']);
});
