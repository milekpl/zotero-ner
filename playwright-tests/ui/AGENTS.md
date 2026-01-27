<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# ui

## Purpose
Playwright UI test specifications for dialogs. Tests actual user interactions with the extension dialogs in a real browser environment.

## Key Files
| File | Description |
|------|-------------|
| `dialog-normalization.spec.js` | Tests for normalization dialog |
| `normalizer-dialog.test.js` | Additional dialog tests |

## For AI Agents

### Working In This Directory
- End-to-end tests using Playwright with Firefox
- Tests verify actual UI rendering and user flows
- Each test file contains multiple test cases

### Testing Requirements
- Run `npm run ui-test` from root
- Requires Firefox installation and configuration
- Tests may require Zotero test profile setup

### Common Patterns
- `test.describe()` groups related tests
- `page.locator()` finds UI elements
- `await` for async operations

## Dependencies

### Internal
- `resources/` - XUL dialog definitions

### External
- Playwright - Browser automation
- Firefox - Test browser

<!-- MANUAL: -->
