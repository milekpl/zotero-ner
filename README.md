# Zotero NER Author Name Normalizer

This Zotero extension uses Named Entity Recognition (NER) to normalize author names in Zotero libraries, addressing common issues with inconsistent name formats and incomplete metadata.

## Problem Solved

Metadata in academic papers often contains author names in various formats:
- Jerry Alan Fodor
- Jerry A. Fodor  
- Jerry Fodor
- J.A. Fodor
- etc.

Additionally, Spanish double surnames and prefixes like "van", "de", "la" are often not properly handled.

## Features

- **NER-based parsing**: Uses GLINER model to identify name components (first name, middle name, last name, prefixes, suffixes)
- **Variant generation**: Creates multiple normalized forms of author names for user selection
- **Learning system**: Remembers user preferences to improve future suggestions
- **Zotero integration**: Seamlessly integrates with Zotero's interface
- **Batch processing**: Process multiple items at once

## Architecture

The extension is organized into the following modules:

### Core
- `ner-processor.js`: Handles NER model integration and name parsing
- `name-parser.js`: Enhanced name parsing logic with special cases
- `variant-generator.js`: Creates multiple normalized name variations
- `learning-engine.js`: Stores and retrieves learned mappings with similarity matching
- `gliner-handler.js`: Interface for GLINER NER model

### UI
- `normalizer-dialog.js`: Dialog for showing normalization options
- `batch-processor.js`: Batch processing interface

### Storage
- `data-manager.js`: Handles data persistence

### Zotero Integration
- `item-processor.js`: Processes Zotero items
- `menu-integration.js`: Adds menu items to Zotero interface

### Worker
- `ner-worker.js`: Handles intensive processing in background

## Installation

1. Make sure you have Zotero installed (version 5.0 or higher)
2. Download the extension package
3. Install in Zotero via Tools → Add-ons → Extensions

## Usage

1. Select items in your Zotero library
2. Right-click and select "Normalize Author Names with NER..." or use the Tools menu
3. Review the suggested normalizations
4. Accept or modify as needed
5. The extension will learn from your choices for future use

## Technical Implementation

The extension currently uses a hybrid approach:
- A rule-based fallback system for immediate functionality
- Integration points for GLINER NER model (using ONNX.js for browser execution)
- Comprehensive learning system to remember user preferences
- Full integration with Zotero's data model

## Dependencies

- onnxruntime-web: For running ONNX models in the browser environment

## Development

To build and test the extension:

```bash
npm install
npm test
```

## Roadmap

Future improvements:
- Better NER model integration with GLINER
- More sophisticated similarity algorithms
- Improved handling of cultural name patterns
- Additional export/import options for learned mappings

## Building the Extension

To build the Zotero 7 extension .xpi file:

```bash
npm run build
```

This creates a distributable .xpi file in the `dist/` directory that is compatible with Zotero 7.

The built extension can be installed in Zotero 7 by:
1. Opening Zotero
2. Going to Tools → Add-ons
3. Clicking the gear icon → "Install Add-on From File..."
4. Selecting the .xpi file from the `dist/` directory

## Compatibility

This extension is now compatible with Zotero 7.x! It uses the modern WebExtension-based architecture required for Zotero 7.

~~This extension is compatible with Zotero versions 5.0 - 6.x. It uses the legacy addon architecture and may not work with Zotero 7.0+ which has a different extension system.~~

~~For Zotero 7.x compatibility, a complete rewrite using the new WebExtension-based architecture would be required.~~

## UI Tests

UI tests using Playwright are included in the `playwright-tests/` directory:

```bash
# Install Playwright browsers (first time only)
npm run ui-test:install

# Run UI tests
npm run ui-test
```

## Development Commands

- `npm test` - Run unit tests
- `npm run test:unit` - Run specific unit tests
- `npm run build` - Build the .xpi extension file
- `npm run ui-test` - Run UI tests with Playwright

## License

This extension is released under the GPL-3.0 license.