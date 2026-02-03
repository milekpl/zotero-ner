<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# src

## Purpose
Main application source code organized by architectural layer. Contains all name normalization processing, Zotero integration, UI components, storage, and background worker modules.

## Key Files
| File | Description |
|------|-------------|
| `index.js` | Main export - bundles all modules for webpack |
| `core/` | Name normalization core modules (see `core/AGENTS.md`) |
| `zotero/` | Zotero integration modules (see `zotero/AGENTS.md`) |
| `ui/` | UI components (see `ui/AGENTS.md`) |
| `storage/` | Data persistence layer (see `storage/AGENTS.md`) |
| `worker/` | Background worker for intensive processing (see `worker/AGENTS.md`) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `core/` | Name parsing, similarity matching, learning engine |
| `zotero/` | Zotero API integration, item processing, menu integration |
| `ui/` | Normalization dialog, batch processor UI |
| `storage/` | localStorage-based persistence |
| `worker/` | Background worker for intensive name processing |

## For AI Agents

### Working In This Directory
- All modules follow ES6 module syntax
- Use barrel exports via `index.js` for the main bundle
- Import from `@/zotero` for Zotero API access
- All modules should be webpack-compatible (no Node.js globals)

### Testing Requirements
- Tests mirror the `src/` structure in `tests/` directory
- Run `npm run test:unit` from root to execute all tests

### Common Patterns
- Learning system: `LearningEngine` stores user preferences with Jaro-Winkler, LCS, and initial-matching similarity
- Name processing: Rule-based name parsing with optional GLINER integration for future enhancements
- Zotero integration: Bootstrap loads bundled code into isolated scope, shares via `window.ZoteroNER` and `Zotero.Ner` hooks

## Dependencies

### Internal
- `src/core/*` - Core name normalization processing
- `src/zotero/*` - Zotero integration
- `src/ui/*` - UI components
- `src/storage/*` - Data persistence
- `src/worker/*` - Background processing

### External
- Zotero API - `@zotero` module for Zotero integration
- onnxruntime-web - ONNX.js runtime for GLINER (optional)

<!-- MANUAL: -->

### IMPORTANT: Debugging in Zotero

**NEVER use `Zotero.debug()`** - it causes the Zotero dialog to hang.

For debugging:
- Use `console.error()` for error-level output (goes to browser error console)
- Use `console.log()` for info-level output
- Or display debug info directly in the dialog HTML for visual feedback
