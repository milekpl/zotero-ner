<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# resources

## Purpose
XUL resources for Zotero extension dialogs. Contains XML-based UI definitions and JavaScript for dialog behavior.

## Key Files
| File | Description |
|------|-------------|
| `normalizer-dialog.xul` | XUL definition for normalization dialog |
| `normalizer-dialog.js` | JavaScript behavior for the dialog |

## For AI Agents

### Working In This Directory
- XUL files define Zotero's traditional UI layout
- `normalizer-dialog.xul` contains dialog structure with textboxes, buttons, lists
- `normalizer-dialog.js` handles dialog initialization and user interactions

### Testing Requirements
- Test via Zotero UI when extension is loaded
- Playwright tests in `playwright-tests/ui/` verify dialog behavior

### Common Patterns
- XUL namespace: `xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"`
- Event handlers: `oncommand` attributes for button actions

## Dependencies

### Internal
- `src/ui/normalizer-dialog.js` - Core dialog logic

### External
- Zotero XUL system

<!-- MANUAL: -->
