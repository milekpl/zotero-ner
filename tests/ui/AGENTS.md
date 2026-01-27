<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# ui

## Purpose
Unit tests for UI components. Tests normalizer dialog, batch processor, and formatting utilities.

## Key Files
| File | Description |
|------|-------------|
| `normalizer-dialog.test.js` | Tests for normalization dialog |
| `normalization-dialog-controller.test.js` | Tests for dialog controller |
| `batch-processor.test.js` | Tests for batch processing UI |
| `formatting.test.js` | Tests for text formatting utilities |

## For AI Agents

### Working In This Directory
- Tests verify UI component behavior
- Dialog tests verify rendering and user interactions
- Batch processor tests verify bulk operations

### Testing Requirements
- Run `npm run test:unit` from root
- Mock DOM APIs for dialog tests

### Common Patterns
- Mock DOM: `document.createElement`, `querySelector`
- Event simulation for user interactions

## Dependencies

### Internal
- `src/ui/*` - Source components being tested
- `src/core/*` - Core modules used by UI

### External
- Jest - Testing framework
- DOM mocks

<!-- MANUAL: -->
