<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# _locales

## Purpose
Localization directory for multi-language support. Contains locale-specific messages used in the extension's UI.

## Key Files
| File | Description |
|------|-------------|
| `en_US/messages.json` | English (US) locale messages |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `en_US/` | English (United States) locale files |

## For AI Agents

### Working In This Directory
- JSON format for locale messages
- `messages.json` contains key-value pairs for UI strings
- Add new locales by creating new directory (e.g., `fr_FR/`)

### Testing Requirements
- Verify locale files are valid JSON
- Test with different browser language settings

### Common Patterns
- Message format: `{"messageKey": {"message": "Display text", "description": "Purpose"}}`
- Reference in code: ` messenger.getMessage('messageKey') `

## Dependencies

### Internal
- None (locale data only)

### External
- None (standard Mozilla locale format)

<!-- MANUAL: -->
