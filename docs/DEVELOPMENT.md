# Development Guide

## Prerequisites

- Node.js 16+
- npm
- Zotero 8.0+ (tested on Zotero 8.0)
- zotero-plugin-scaffold

## Setup

### Installation

1. Install dependencies:
```bash
npm install
```

2. Point the scaffold at your Zotero binary by creating `.env` (git-ignored):
```bash
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/Applications/Zotero.app/Contents/MacOS/zotero
```

The scaffold reads `ZOTERO_PLUGIN_*` environment variables (dotenv is loaded from
the project root); it does not read a `~/.zotero-plugin` file. Optional:
`ZOTERO_PLUGIN_PROFILE_PATH` to use your real library instead of the throwaway
profile under `.scaffold/`.

3. Start development:
```bash
npm start
```

This launches Zotero with hot reload enabled.

## Build

Create a production build:
```bash
npm run build
```

The built extension is in `build/addon/`.

## Release

Releases are driven by a tag push; CI builds and publishes, so there is no
manual upload step.

1. Cut the release locally — this bumps `package.json` and `manifest.json`,
   commits, tags, and pushes:
```bash
npm run release
```

2. Pushing the `v*` tag triggers `.github/workflows/release.yml`, which builds
   the XPI, creates the GitHub Release for the tag with the XPI attached, and
   commits the regenerated `update.json` back to `main`.

`update_url` in `manifest.json` points at `main/update.json`, so installed
copies pick up the new version from that commit.

If CI cannot publish (e.g. it is unavailable), do it by hand:
```bash
npm run build
npx zotero-plugin release   # with GITHUB_TOKEN set
cp build/update.json update.json
```
then create the Release for the tag on GitHub and attach
`build/<xpi>.xpi`. The XPI attached **must** be the one whose hash is in
`update.json`.

## Architecture

### Core Modules (`src/core/`)
- `name-parser.js`: Enhanced name parsing with special cases
- `variant-generator.js`: Creates normalized name variations
- `learning-engine.js`: Stores and retrieves learned mappings
- `candidate-finder.js`: Finds similar names in library

### UI Modules (`src/ui/`)
- `normalizer-dialog.js`: Dialog for normalization options
- `batch-processor.js`: Batch processing interface

### Zotero Integration (`src/zotero/`)
- `item-processor.js`: Processes Zotero items
- `menu-integration.js`: Adds menu items to Zotero

### Storage (`src/storage/`)
- `data-manager.js`: Handles data persistence

### Content (`content/`)
- `dialog.html`: Dialog UI
- `zotero-ner.js`: Extension main logic
- `zotero-name-normalizer-bundled.js`: Bundled core modules (webpack output)

### Bootstrap (`bootstrap.js`)
- Extension lifecycle management (startup, shutdown)
- Chrome URI registration for `chrome://zoteronamenormalizer/`
- Bundle injection into Zotero windows

## Technical Details

### Zotero 8 Compatibility

Key implementation details for Zotero 8:

- **Bootstrap extension**: Uses `bootstrap.js` for extension lifecycle
- **ESM modules**: `ChromeUtils.importESModule()` for module imports
- **Console polyfill**: Provides `console` object for bundled code
- **Chrome URI registration**: Registers `chrome://zoteronamenormalizer/` at runtime via `amIAddonManagerStartup`

### Build System

- **Webpack**: Bundles source code with console polyfill banner
- **zotero-plugin-scaffold**: Manages dev server, builds, and distribution
- **asProxy: false**: Extension manages its own Zotero launch

## Testing

Run unit tests:
```bash
npm run test:unit
```

Run UI tests:
```bash
npm run ui-test
```

## File Structure

```
.
├── bootstrap.js              # Extension entry point
├── manifest.json             # WebExtension manifest
├── src/                      # Source code
│   ├── core/                 # Core naming logic
│   ├── ui/                   # UI components
│   ├── zotero/               # Zotero integration
│   ├── storage/              # Data storage
│   └── index.js              # Bundle entry point
├── content/                  # UI resources
│   ├── dialog.html           # Dialog UI
│   ├── scripts/              # JavaScript
│   │   ├── zotero-ner.js     # Main extension code
│   │   └── zotero-name-normalizer-bundled.js  # Bundled modules (webpack)
│   └── icons/                # Icon assets
├── resources/                # XUL resources
├── _locales/                 # Localization files
└── webpack.config.js         # Webpack configuration
```

## Development Notes

### Console Polyfill

Since `console` is not available in Zotero's bootstrap scope, a polyfill is injected at the top of the bundled code via webpack's `BannerPlugin`. It maps `console.*` calls to `Zotero.debug()`.

### Hot Reload

When developing with `npm start`:
1. The scaffold server watches `src/` for changes
2. Modified files are rebuilt with webpack
3. The extension is reloaded in Zotero automatically
4. Debug output is visible in Zotero's console

### Dialog Window

The normalization dialog:
- Opened via `mainWindow.openDialog()`
- Uses `chrome://zoteronamenormalizer/content/dialog.html`
- Receives parameters via `mainWindow.ZoteroNameNormalizerDialogParams`
- Loads the bundled extension code for processing
