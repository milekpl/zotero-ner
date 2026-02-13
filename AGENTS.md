# AGENTS.md - Development Guidelines

## Purpose
Development guidelines for AI agents working on the Zotero Data Normalizer extension. Contains build commands, code style rules, and project-specific patterns.

## Build & Test Commands

### Core Commands
```bash
# Install dependencies
npm install

# Development (starts Zotero plugin server)
npm run dev

# Build extension for production
npm run build

# Release (creates distributable XPI)
npm run release
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run Zotero integration tests
npm run test:zotero

# Run UI tests (Playwright)
npm run ui-test

# Run single test file
npm test -- tests/core/name-parser.test.js

# Run single test with watch mode
npm test -- --watch tests/core/name-parser.test.js

# Run tests in debug mode
npm run test:zotero:debug
```

### Linting
```bash
# Run ESLint
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

### Development Tools
```bash
# Install Playwright browsers for UI testing
npm run ui-test:install

# Start Zotero plugin server (development)
npm run dev
```

## Code Style Guidelines

### Formatting
- **Indentation**: 2 spaces (no tabs)
- **Line endings**: Unix style (LF)
- **Quotes**: Single quotes for strings
- **Semicolons**: Required at end of statements
- **Max line length**: 80 characters (soft limit)

### File Structure
- **ES6 modules**: Use `import/export` syntax
- **Barrel exports**: Use `index.js` for main bundle exports
- **File naming**: kebab-case for files, PascalCase for classes
- **Directory structure**: Mirror `src/` in `tests/` for test files

### Import Style
```javascript
// External dependencies first
import { someFunction } from 'external-library';

// Internal dependencies (use @/ alias)
import { ItemProcessor } from '@/zotero/item-processor.js';
import { LearningEngine } from '@/core/learning-engine.js';

// Local imports (relative paths)
import { normalizeName } from './utils/name-utils.js';
```

### Naming Conventions
- **Classes**: PascalCase (e.g., `ItemProcessor`, `LearningEngine`)
- **Functions/Variables**: camelCase (e.g., `processItems`, `userSelections`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_BATCH_SIZE`, `DEFAULT_TIMEOUT`)
- **Files**: kebab-case (e.g., `item-processor.js`, `learning-engine.js`)
- **Private members**: Prefix with underscore (e.g., `_itemProcessor`)

### Error Handling
```javascript
// Use try-catch for async operations
async function processItems(items) {
  try {
    const results = await Promise.all(items.map(processItem));
    return results;
  } catch (error) {
    console.error('Error processing items:', error.message);
    throw error; // Re-throw for caller to handle
  }
}

// Validate inputs early
function processItem(item) {
  if (!item || !item.id) {
    throw new Error('Invalid item: missing required properties');
  }
  
  // Process item...
}
```

### Type Safety
- **No TypeScript**: Project uses plain JavaScript with JSDoc
- **JSDoc comments**: Document function parameters and return types
- **Runtime validation**: Validate object shapes at runtime

### Zotero Integration Patterns
```javascript
// Always check Zotero context
if (typeof Zotero === 'undefined') {
  throw new Error('This feature requires Zotero context');
}

// Use Zotero API methods
const items = await Zotero.Items.get([itemId]);
const fieldValue = item.getField('publisher');

// Database operations
const results = await Zotero.DB.queryAsync('SELECT * FROM items WHERE libraryID = ?', [libraryID]);
```

### Performance Guidelines
- **Batch processing**: Process items in batches (100-200 items)
- **Memory management**: Avoid holding large datasets in memory
- **Async operations**: Use async/await for I/O operations
- **Progress indicators**: Show progress for long-running operations

### Testing Guidelines
- **Unit tests**: Test individual functions in `tests/unit/`
- **Integration tests**: Test Zotero integration in `tests/zotero/`
- **UI tests**: Test browser UI with Playwright in `playwright-tests/`
- **Test naming**: Use descriptive test names that explain the scenario

### Security & Privacy
- **No data exfiltration**: Never send user data outside the extension
- **Input validation**: Sanitize all user inputs
- **Error messages**: Don't expose sensitive information in errors

### Zotero Extension Specific
- **Never use `Zotero.debug()`**: Causes dialog hangs
- **Use `console.error()`**: For error-level output
- **Use `console.log()`**: For info-level output
- **XUL dialogs**: Use HTML5 dialogs instead of legacy XUL

### Common Patterns
```javascript
// Learning engine usage
const learningEngine = new LearningEngine();
await learningEngine.storeMapping(rawValue, normalizedValue, 'publisher');

// Dialog pattern
const dialog = new NormalizerDialog();
const selections = await dialog.showDialog(items);

// Batch processing
async function processInBatches(items, batchSize = 100) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processBatch(batch);
  }
}
```

## Project Focus
This is a **data normalization** extension, not a named entity recognition (NER) tool. Focus on:
- Extracting structured data from flat Zotero fields
- Normalizing publisher names, locations, and journal names
- Providing consistent, machine-readable data formats
- Learning user preferences for normalization decisions

## Debugging in Zotero
- **Use `console.error()`** for errors (goes to browser console)
- **Use `console.log()`** for info messages
- **Avoid `Zotero.debug()`** (causes dialog hangs)
- **Display debug info** directly in dialog HTML for visual feedback

## Dependencies
- **Internal**: Use barrel exports from `src/index.js`
- **External**: Import from `@/zotero` for Zotero API access
- **Webpack**: All modules must be webpack-compatible (no Node.js globals)