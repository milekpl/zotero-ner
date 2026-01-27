<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# zotero

## Purpose
Zotero integration modules. Provides interface to Zotero's data model, processes items, integrates with Zotero UI via menu items, and analyzes the Zotero SQLite database.

## Key Files
| File | Description |
|------|-------------|
| `item-processor.js` | Processes Zotero items, extracts and normalizes author names |
| `menu-integration.js` | Adds menu items to Zotero interface |
| `zotero-db-analyzer.js` | Analyzes Zotero SQLite database structure and data |

## For AI Agents

### Working In This Directory
- All modules depend on Zotero API (`@zotero` module)
- `item-processor.js` is the main entry point for processing Zotero items
- Database operations require proper Zotero lifecycle management
- Menu items are registered during Zotero extension startup

### Testing Requirements
- Tests in `tests/zotero/` require Zotero test environment
- Integration tests in `tests/zotero-integration/` test full Zotero workflow

### Common Patterns
- Zotero API: Use `Zotero.Items.get()` to retrieve items, `item.getField()` for data
- Author data: stored in `item.creators` array with `{ firstName, lastName, creatorType }`
- Database: direct SQLite access via `Zotero.DB.*` APIs

## Dependencies

### Internal
- `src/core/*` - For name normalization processing
- `src/ui/*` - For displaying normalization results

### External
- Zotero API - `@zotero` module for all Zotero operations
- Zotero SQLite database - Direct database access

<!-- MANUAL: -->
