# Zotero NER Author Name Normalizer - Project Documentation

## Project Overview

Zotero NER Author Name Normalizer is a Zotero 7 compatible extension that uses Named Entity Recognition (NER) to normalize author names in Zotero libraries, addressing common issues with inconsistent name formats and incomplete metadata. The extension addresses problems where academic papers contain author names in various formats (e.g., "Jerry Alan Fodor", "Jerry A. Fodor", "J.A. Fodor", etc.) and handles special cases like Spanish double surnames and prefixes ("van", "de", "la").

The extension is built as a WebExtension-based plugin using modern Zotero 7 architecture and integrates seamlessly with the Zotero interface. It features a hybrid approach combining rule-based fallback systems with integration points for the GLINER NER model.

## Architecture

The extension is organized into several key modules:

### Core Modules
- `ner-processor.js`: Handles NER model integration and name parsing
- `name-parser.js`: Enhanced name parsing logic with special cases for prefixes, suffixes, and cultural name patterns
- `variant-generator.js`: Creates multiple normalized name variations for user selection
- `learning-engine.js`: Stores and retrieves learned mappings with similarity matching algorithms (Jaro-Winkler, LCS)
- `gliner-handler.js`: Interface for GLINER NER model
- `candidate-finder.js`: Finds potential name candidates for normalization

### UI Modules
- `normalizer-dialog.js`: Dialog for showing name normalization options
- `batch-processor.js`: Batch processing interface for multiple items

### Storage Modules
- `data-manager.js`: Handles data persistence

### Zotero Integration Modules
- `item-processor.js`: Processes Zotero items
- `menu-integration.js`: Adds menu items to Zotero interface
- `zotero-db-analyzer.js`: Direct database access for batch operations

### Worker
- `ner-worker.js`: Handles intensive processing in background

## Zotero Integration Approaches

The extension can utilize multiple approaches for integrating with Zotero, each with different advantages and trade-offs:

### 1. Zotero JavaScript API Integration

The extension follows best practices for Zotero JavaScript API integration based on the official documentation at https://www.zotero.org/support/dev/client_coding/javascript_api

#### Core Concepts
- **Window Scope vs Non-Window Scope**: Understanding the difference between main window and dialog contexts
- **Zotero Object Availability**: Properly checking for and accessing the Zotero object
- **Database Access**: Using Zotero.DB for direct database queries and Zotero.Search for filtered searches
- **Asynchronous Operations**: Using async/await for database operations
- **Transactions**: Using Zotero.DB.executeTransaction for batch operations

#### Key API Methods
- `Zotero.getActiveZoteroPane()` - Get the active Zotero pane for UI interactions
- `Zotero.Items.getAsync()` - Get items by ID asynchronously
- `Zotero.DB.query()` - Execute direct SQL queries on the Zotero database
- `Zotero.Search` - Perform filtered searches with conditions
- `Zotero.Libraries.userLibraryID` - Get the current user library ID

#### Database Access Patterns
The extension uses two main approaches for database access:
1. **Direct Database Queries**: Using `Zotero.DB.query()` for efficient batch operations
2. **Filtered Searches**: Using `Zotero.Search` with conditions for more complex filtering

#### UI Integration Best Practices
- Proper error handling with `Zotero.logError()`
- Context-aware initialization (checking for Zotero availability)
- Menu and toolbar integration patterns
- Dialog lifecycle management

For detailed API reference, see `Zotero_JS_API.md`.

### 2. Direct SQLite Database Access

The extension can also access the Zotero SQLite database directly for efficient batch operations. This approach is particularly useful for:
- Processing entire libraries without UI context
- Performing complex queries efficiently
- Avoiding UI selection complexities

For detailed information about direct database access, see `ZOTERO_SQLITE_ACCESS.md`.

### 3. Zotero Web API

The extension can alternatively use the Zotero Web API for programmatic access to library data. This approach is particularly useful for:
- Web-based applications
- Scripts that run independently of the Zotero UI
- Applications that need to work with remote libraries

For detailed information about the Web API, see `ZOTERO_WEB_API.md`.

## Recommended Approach

For the NER Author Name Normalizer extension, the recommended approach is to use **Direct SQLite Database Access** because:
1. It provides efficient access to all library data without UI context issues
2. It avoids the complexity of dealing with selected items and dialog contexts
3. It enables comprehensive batch processing of the entire library
4. It offers better performance for large-scale name normalization tasks

This approach aligns with the suggestion to connect directly to the Zotero database and process all creators, eliminating the need for complex UI selection handling.

## Building and Running

### Prerequisites
- Node.js and npm
- Zotero 7.x installed

### Development Commands
- `npm install` - Install dependencies
- `npm run build` - Build the .xpi extension file for distribution
- `npm test` - Run all tests (unit + UI)
- `npm run test:unit` - Run unit tests using Jest
- `npm run ui-test` - Run UI tests with Playwright
- `npm run ui-test:install` - Install Playwright browsers (first time only)

### Building the Extension
To build the Zotero 7 extension .xpi file:
```bash
npm run build
```

This creates a distributable .xpi file in the `dist/` directory that is compatible with Zotero 7. The built extension can be installed in Zotero 7 by:
1. Opening Zotero
2. Going to Tools → Add-ons
3. Clicking the gear icon → "Install Add-on From File..."
4. Selecting the .xpi file from the `dist/` directory

## Development Conventions

### Code Structure
- Modern ES6+ JavaScript modules
- Component-based architecture with clear separation of concerns
- Asynchronous operations using Promises and async/await
- Comprehensive error handling throughout

### File Organization
- `src/` - Source code organized by functionality (core, ui, zotero, storage, worker)
- `content/` - Zotero-specific content files and UI elements
- `content/scripts/` - Browser-executable scripts including bundled core functionality
- `tests/` - Unit tests using Jest
- `playwright-tests/` - UI tests using Playwright

### Testing
- Unit tests using Jest (run with `npm run test:unit`)
- UI tests using Playwright (run with `npm run ui-test`)
- Complete test suite runs with `npm test`

### UI Integration
- Implements both legacy XUL and modern HTML elements for backward compatibility
- Adds both toolbar button and Tools menu item for easy access
- Uses Zotero's window management system for proper initialization and cleanup

## Key Features

### Name Normalization
- NER-based parsing using GLINER model (with rule-based fallback)
- Enhanced name parsing logic for prefixes (van, de, la, von, etc.) and suffixes (Jr, Sr, II, III, etc.)
- Special handling for Spanish/Portuguese names with multi-part prefixes
- Support for cultural name patterns including Spanish double surnames

### Learning System
- Remembers user preferences to improve future suggestions
- Advanced similarity algorithms (Jaro-Winkler, longest common subsequence)
- Tracks usage patterns and confidence scores
- Export/import functionality for learned mappings

### Batch Processing
- Process multiple Zotero items simultaneously
- Provides comprehensive review interface before applying changes
- Maintains original metadata during normalization process

### Integration
- Seamless Zotero 7 WebExtension integration
- Toolbar button and Tools menu integration
- Proper cleanup and teardown of UI elements
- Cross-platform compatibility (Windows, macOS, Linux)

## Technical Implementation

The extension implements a hybrid approach combining:
- Rule-based fallback system for immediate functionality
- Integration points for GLINER NER model using ONNX.js for browser execution
- Comprehensive learning system with similarity matching algorithms
- Full integration with Zotero's data model and UI systems

The build process uses Webpack to bundle all core functionality into a single JavaScript file, which is then loaded into Zotero windows via the bootstrap system. The extension properly initializes in Zotero's main window and manages UI elements across different Zotero window states.

## Dependencies

- `onnxruntime-web`: For running ONNX models in the browser environment
- `@playwright/test`: For UI testing
- `jest`: For unit testing
- `webpack`: For bundling the extension

## Extension Lifecycle

### Bootstrap Process
1. `bootstrap.js` registers the extension with Zotero
2. Core modules are bundled and loaded into an isolated scope
3. UI elements are injected into Zotero windows upon load
4. Toolbar button and menu items are created in Zotero interface

### UI Injection
- Uses both XUL and HTML elements for compatibility
- Dynamically adds toolbar button and Tools menu item
- Properly manages styles and event listeners
- Implements proper cleanup on window close

### Cleanup
- Removes all UI elements when extension is shutdown
- Cleans up event listeners and references
- Preserves learned mappings and user preferences across sessions