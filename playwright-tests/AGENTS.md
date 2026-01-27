<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# playwright-tests

## Purpose
Playwright browser automation tests for UI verification. Tests actual browser interaction with the extension dialogs and UI components.

## Key Files
| File | Description |
|------|-------------|
| `playwright.config.js` | Playwright configuration |
| `ui/` | UI test specifications (see `ui/AGENTS.md`) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `ui/` | UI interaction tests |

## For AI Agents

### Working In This Directory
- Tests use Playwright to automate browser interactions
- Requires Firefox to be installed
- Tests verify actual extension behavior in browser context

### Testing Requirements
- Run `npm run ui-test` from root to execute
- Requires Firefox binary path configuration

### Common Patterns
- `test()` blocks define test cases
- `page.goto()` navigates to test pages
- `expect()` assertions verify UI state

## Dependencies

### Internal
- `content/` - Extension files being tested

### External
- Playwright - Browser automation
- Firefox - Test browser

<!-- MANUAL: -->
