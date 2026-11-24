import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getFigmaFile } from '../dist/chromium/figma-tab.js';

test('identifies the file regardless of the name or current page', () => {
  assert.deepEqual(getFigmaFile('https://www.figma.com/design/D3m0/Caf%C3%A9?node-id=0-1&p=f'), {
    origin: 'https://www.figma.com',
    path: '/design/D3m0',
  });
  assert.deepEqual(getFigmaFile('https://figma.com/file/D3m0'), {
    origin: 'https://figma.com',
    path: '/file/D3m0',
  });
});

test('rejects other origins and paths outside the design editor', () => {
  for (const url of [
    undefined,
    'figma.com/design/D3m0',
    'http://www.figma.com/design/D3m0',
    'https://www.figma.com:8443/design/D3m0',
    'https://www.figma.com.example/design/D3m0',
    'https://www.figma.com@evil.example/design/D3m0',
    'https://www.figma.com/files/recent',
    'https://www.figma.com/proto/D3m0/Demo',
    'https://www.figma.com/design/',
    'https://www.figma.com/design/D3-m0/Demo',
  ]) {
    assert.equal(getFigmaFile(url), undefined, url);
  }
});
