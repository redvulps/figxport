# Figxport

Figxport exports the Figma Design file open in the current browser tab as a native `.fig` file. It uses Figma's **Save local copy** command with your current session. The export contains every page in the document.

The extension supports Chrome, Brave, and Firefox. The interface follows your browser language and is available in English and Brazilian Portuguese. English is the fallback.

## Install

Download the ZIP for your browser from [GitHub Releases](https://github.com/redvulps/figxport/releases/latest) and extract it.

- **Chrome 102+ and Brave.** Open `chrome://extensions` or `brave://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted folder.
- **Firefox 140+.** Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json` from the extracted folder. Firefox removes temporary installations on restart.

## Export and import

1. Open a Figma Design file with an account that can export it. Wait for the editor to load.
2. Open Figxport and select **Download .fig**. Wait while Figma prepares the file. If the browser opens a save dialog, choose a location and confirm.
3. In FigCraft, choose **File → Open** to open the `.fig`, or **File → Import** to append its pages to the current document. Review any warnings from the importer.

If Figxport cannot find the command, try **Figma main menu → File → Save local copy**. Availability depends on the file's export permissions. [Figma Help](https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files)

FigCraft reads the ZIP container and the `fig-kiwi` document inside it. Import fidelity depends on the features used in the design. [FigCraft format compatibility](https://github.com/jgasilva/figcraft/blob/main/docs/file-format-parity.md)

## Build locally

Use Node.js 22 or later.

```sh
npm ci
npm run build
```

Load the build from `dist/chromium` or `dist/firefox` using the installation steps above. Run `npm test` to build and run the tests.

## Source layout

- `src/figma-tab.ts` identifies the Figma file in the active tab.
- `src/figma-export.ts` finds and runs the native export command. It recognizes English and Brazilian Portuguese menu labels.
- `src/popup.ts` handles messages, user actions, and browser API calls.
- `extension/_locales/` contains the WebExtension translation catalogs.
- `scripts/build.mjs` generates both manifests from one configuration.

Figxport uses `activeTab` and `scripting` to run in the selected tab when you click **Download .fig**. The design and download stay in your browser.
