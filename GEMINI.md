# Project Overview

This project is a Zotero extension that uses Named Entity Recognition (NER) to normalize author names. It addresses the problem of inconsistent author name formats in academic metadata. The extension can identify different parts of a name (first, middle, last, prefix, suffix) and suggest standardized versions. It also includes a learning system that remembers user preferences for future suggestions.

## Main Technologies

*   **Backend:** JavaScript (ES6 modules)
*   **Frontend:** XUL for the Zotero UI
*   **Build Tool:** Webpack
*   **Testing:** Jest for unit tests, Playwright for UI tests
*   **NER Model:** GLINER (via onnxruntime-web)

## Architecture

The project is organized into the following modules:

*   `src/core`: Contains the core logic for NER processing, name parsing, variant generation, and a learning engine.
*   `src/ui`: Handles the user interface, including a dialog for normalization options.
*   `src/storage`: Manages data persistence.
*   `src/zotero`: Integrates the extension with Zotero's UI and data model.
*   `src/worker`: Offloads intensive processing to a background worker.

# Building and Running

## Installation

```bash
npm install
```

## Building the Extension

To build the Zotero 7 extension `.xpi` file:

```bash
npm run build
```

This creates a distributable `.xpi` file in the `dist/` directory.

## Running Tests

### Unit Tests

```bash
npm test
```

### UI Tests

First, install the necessary browser dependencies:

```bash
npm run ui-test:install
```

Then, run the UI tests:

```bash
npm run ui-test
```

# Development Conventions

*   The code is written in JavaScript using ES6 modules.
*   The project uses Webpack to bundle the code for the extension.
*   Unit tests are written with Jest and are located in the `tests/` directory.
*   UI tests are written with Playwright and are located in the `playwright-tests/` directory.
*   The extension is compatible with Zotero 7 and uses the modern WebExtension-based architecture.
