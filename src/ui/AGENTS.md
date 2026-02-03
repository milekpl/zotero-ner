<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# ui

## Purpose
User interface components for the name normalization extension. Provides dialogs for viewing and modifying name normalizations, and batch processing UI.

## Key Files
| File | Description |
|------|-------------|
| `normalizer-dialog.js` | Main dialog for viewing and editing name normalizations |
| `batch-processor.js` | UI for batch processing multiple items |

## For AI Agents

### Working In This Directory
- UI components interact with Zotero's XUL/XML-based UI system
- Dialogs are loaded via XUL overlay or standalone window
- `normalizer-dialog.js` handles the normalization review workflow
- `batch-processor.js` handles bulk normalization operations

### Testing Requirements
- Tests in `tests/ui/` test UI components with Jest
- Playwright tests in `playwright-tests/ui/` test actual browser UI

### Common Patterns
- XUL dialogs: defined in `resources/normalizer-dialog.xul`
- Event handling: Zotero's event system for UI updates
- Data binding: sync UI state with learning engine

## Dependencies

### Internal
- `src/core/*` - For name normalization logic
- `src/zotero/*` - For item data access
- `src/storage/*` - For persisting user preferences

### External
- Zotero UI API - XUL/XML dialog system

<!-- MANUAL: -->
