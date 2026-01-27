<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# zotero-integration

## Purpose
Zotero-specific integration tests that verify extension behavior within Zotero. Tests item processing, creator normalization, and library interactions.

## Key Files
| File | Description |
|------|-------------|
| `index.js` | Test entry point |
| `run-tests.js` | Test runner |
| `run-tests-simple.js` | Simple test runner |
| `run-tests-playwright.js` | Playwright test runner |
| `profile/` | Zotero test profile |
| `README.md` | Integration testing documentation |

## For AI Agents

### Working In This Directory
- Tests verify behavior within actual Zotero environment
- Multiple test runners for different scenarios
- Test profile configured for Zotero 7

### Testing Requirements
- Requires Zotero installation
- Run via `npm run test:integration` or specific runner
- Profile contains Zotero preferences

### Common Patterns
- Zotero API integration testing
- Creator data normalization verification

## Dependencies

### Internal
- `src/*` - All source modules

### External
- Zotero - Target application
- Jest - Testing framework (some runners)

<!-- MANUAL: -->
