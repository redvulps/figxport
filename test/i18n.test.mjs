import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('packages complete translation catalogs for both browsers', () => {
  for (const target of ['chromium', 'firefox']) {
    const read = (path) => readFileSync(new URL(`../dist/${target}/${path}`, import.meta.url), 'utf8');
    const manifest = read('manifest.json');
    const html = read('popup.html');
    const catalogs = ['en', 'pt_BR'].map((locale) => JSON.parse(read(`_locales/${locale}/messages.json`)));

    assert.equal(JSON.parse(manifest).default_locale, 'en');
    assert.deepEqual(Object.keys(catalogs[0]).sort(), Object.keys(catalogs[1]).sort());

    const references = [...manifest.matchAll(/__MSG_(\w+)__/g), ...html.matchAll(/data-i18n="(\w+)"/g)];
    for (const catalog of catalogs) {
      for (const [, key] of references) {
        assert.ok(catalog[key]?.message.trim(), `${target} is missing ${key}`);
      }
      for (const { message } of Object.values(catalog)) assert.ok(message.trim());
    }
  }
});
