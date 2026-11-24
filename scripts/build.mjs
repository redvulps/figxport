import { cpSync, readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const manifest = {
  manifest_version: 3,
  name: '__MSG_extensionName__',
  version,
  description: '__MSG_extensionDescription__',
  default_locale: 'en',
  permissions: ['activeTab', 'scripting'],
  action: { default_title: '__MSG_extensionName__', default_popup: 'popup.html' },
};

cpSync('extension', 'dist/chromium', { recursive: true });

function writeManifest(target, settings) {
  writeFileSync(`dist/${target}/manifest.json`, `${JSON.stringify({ ...manifest, ...settings }, null, 2)}\n`);
}

writeManifest('chromium', { minimum_chrome_version: '102' });
cpSync('dist/chromium', 'dist/firefox', { recursive: true });
writeManifest('firefox', {
  browser_specific_settings: {
    gecko: {
      id: '@figxport',
      strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] },
    },
  },
});
