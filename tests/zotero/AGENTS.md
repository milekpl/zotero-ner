<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# zotero

## Purpose
Unit tests for Zotero integration modules. Tests item processing, menu integration, and database analysis.

## Key Files
| File | Description |
|------|-------------|
| `item-processor.test.js` | Tests for Zotero item processing |
| `menu-integration.test.js` | Tests for menu registration |
| `zotero-db-analyzer.test.js` | Tests for database analysis |
| `zotero-integration.test.js` | Tests for Zotero integration |

## For AI Agents

### Working In This Directory
- Tests may require Zotero API mocks
- `zotero-db-analyzer.test.js` tests SQLite query generation
- Menu integration tests verify menu item registration

### Testing Requirements
- Run `npm run test:unit` from root
- Mock `@zotero` module where needed

### Common Patterns
- Mock Zotero API: `jest.mock('@zotero', ...)`
- Test data: sample Zotero items with creators

## Dependencies

### Internal
- `src/zotero/*` - Source modules being tested
- `src/core/*` - Core modules used by integration

### External
- Jest - Testing framework
- Zotero API mocks

<!-- MANUAL: -->
