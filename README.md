# Zotero Name Normalizer

A Zotero 7/8 extension that normalizes author names in Zotero libraries.

## Status

**Fully functional** - Extension loads in Zotero 8, displays UI menu, opens dialogs with all normalization options available.

## Problem Solved

Academic metadata contains author names in various formats:
- Jerry Alan Fodor vs Jerry A. Fodor vs Jerry Fodor vs J.A. Fodor
- Inconsistent handling of Spanish double surnames
- Prefixes like "van", "de", "la" often misplaced

This extension normalizes these variations for better search and citation functionality.

## Features

- **Name parsing**: Parses author names and identifies components
- **Variant generation**: Creates multiple normalized forms for user selection
- **Learning system**: Remembers user preferences for future suggestions
- **Zotero integration**: Seamlessly integrates with Zotero's interface
- **Batch processing**: Process multiple items at once

## Development Setup

### Prerequisites

- Node.js 16+
- npm
- Zotero 8.0+ (tested on Zotero 8.0)
- zotero-plugin-scaffold

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure the Zotero scaffold by creating `~/.zotero-plugin`:
```bash
zoteroBinPath=/usr/local/bin/zotero
profilePath=/home/username/.zotero/zotero/PROFILE_NAME
dataDir=/home/username/.zotero/zotero/PROFILE_NAME/zotero
```

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

## License

GPL-3.0
