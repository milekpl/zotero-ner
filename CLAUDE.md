# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zotero NER Author Name Normalizer - A Zotero 7 extension that uses Named Entity Recognition (NER) to normalize author names in Zotero libraries. It handles inconsistent name formats (e.g., "Jerry A. Fodor" vs "J.A. Fodor") and special cases like Spanish surnames and prefixes (van, de, la).

## Development Commands

```bash
npm install              # Install dependencies
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run test:unit        # Run Jest unit tests
npm run ui-test          # Run Playwright UI tests
npm run test             # Run both unit and UI tests
npm run dev              # Webpack watch mode for development
npm run build            # Build .xpi extension file
```

## Architecture

### Extension Loading (Zotero 7 Hybrid)

- **bootstrap.js**: Extension entry point - handles lifecycle (install, startup, shutdown), registers chrome URIs, loads bundled code into Zotero's scope
- **manifest.json**: Extension manifest (Manifest V2, Zotero 7.x only: strict_min_version "6.999", strict_max_version "7.*")

### Module Organization (src/)

```
src/
├── index.js                    # Main export - bundles all modules
├── core/
│   ├── ner-processor.js        # NER name parsing, similarity matching
│   ├── name-parser.js          # Enhanced name component parsing
│   ├── variant-generator.js    # Generates normalized name variations
│   ├── learning-engine.js      # Stores learned mappings with Jaro-Winkler similarity
│   ├── candidate-finder.js     # Finds candidate matches
│   └── gliner-handler.js       # GLINER NER model interface (ONNX.js)
├── zotero/
│   ├── item-processor.js       # Processes Zotero items
│   ├── menu-integration.js     # Adds menu items to Zotero interface
│   └── zotero-db-analyzer.js   # Analyzes Zotero SQLite DB
├── ui/
│   ├── normalizer-dialog.js    # Normalization options dialog
│   └── batch-processor.js      # Batch processing UI
├── storage/
│   └── data-manager.js         # localStorage-based persistence
└── worker/
    └── ner-worker.js           # Background worker for intensive processing
```

### Build Pipeline

- **webpack.config.js**: Bundles `src/index.js` → `content/scripts/zotero-ner-bundled.js` (UMD format)
- **build.js**: Runs webpack, stages files, creates .xpi in `dist/`

### Key Design Patterns

1. **Learning System**: The LearningEngine stores user preferences in localStorage with Jaro-Winkler, LCS, and initial-matching similarity algorithms for fuzzy matching
2. **NER Fallback**: Currently uses rule-based parsing; GLINER integration via onnxruntime-web is available for future use
3. **Zotero Integration**: Bootstrap loads bundled code into isolated scope, then shares via window.ZoteroNER and Zotero.NER hooks
