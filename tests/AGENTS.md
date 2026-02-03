<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# tests

## Purpose
Jest unit test suite organized to mirror the `src/` directory structure. Tests verify correctness of core modules, Zotero integration, UI components, storage, and worker functionality.

## Key Files
| File | Description |
|------|-------------|
| `jest.config.js` | Jest configuration |
| `core/` | Core module tests (see `core/AGENTS.md`) |
| `zotero/` | Zotero integration tests (see `zotero/AGENTS.md`) |
| `ui/` | UI component tests (see `ui/AGENTS.md`) |
| `storage/` | Storage layer tests (see `storage/AGENTS.md`) |
| `worker/` | Worker tests (see `worker/AGENTS.md`) |
| `integration/` | Full workflow integration tests |
| `automation/` | Automation test profile configuration |
| `zotero-framework/` | Zotero framework compatibility tests |
| `zotero-integration/` | Zotero integration tests |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `core/` | Unit tests for name normalization modules |
| `zotero/` | Unit tests for Zotero integration |
| `ui/` | Unit tests for UI components |
| `storage/` | Unit tests for data persistence |
| `worker/` | Unit tests for background worker |
| `integration/` | End-to-end workflow tests |
| `automation/` | Firefox automation test setup |
| `zotero-framework/` | Zotero framework compatibility |
| `zotero-integration/` | Zotero-specific integration tests |

## For AI Agents

### Working In This Directory
- Tests mirror `src/` structure: `tests/core/*.test.js` tests `src/core/*.js`
- Run `npm run test:unit` from root to execute all tests
- Mock Zotero API in tests that require it

### Testing Requirements
- All tests should pass before committing changes
- New features require corresponding tests
- Use Jest's `describe`/`test`/`expect` syntax

### Common Patterns
- Mock imports: `jest.mock('...')` for external dependencies
- Test utilities: `tests/automation/test-profile/` contains test configuration

## Dependencies

### Internal
- `src/*` - Source code being tested

### External
- Jest - Testing framework
- Zotero test environment (for integration tests)

<!-- MANUAL: -->
