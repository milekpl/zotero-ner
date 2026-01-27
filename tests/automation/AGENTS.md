<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# automation

## Purpose
Firefox automation test profile configuration. Contains test profile settings for running automated tests with Firefox.

## Key Files
| File | Description |
|------|-------------|
| `test-profile/` | Firefox test profile directory |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `test-profile/` | Firefox profile settings for tests |

## For AI Agents

### Working In This Directory
- Contains Firefox profile configuration files
- `prefs.js` - Firefox preferences for testing
- `extensions.ini` - Extension configuration
- `compatibility.ini` - Firefox compatibility settings

### Testing Requirements
- Used by Playwright when launching Firefox
- Ensure profile matches Zotero's requirements

### Common Patterns
- Preference settings for headless testing
- Extension enablement configuration

## Dependencies

### External
- Firefox - Test browser
- Playwright - Test runner

<!-- MANUAL: -->
