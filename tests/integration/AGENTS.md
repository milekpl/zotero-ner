<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# integration

## Purpose
End-to-end integration tests that verify full workflow functionality. Tests complete normalization process from item processing through UI display.

## Key Files
| File | Description |
|------|-------------|
| `full-workflow.test.js` | Complete workflow integration test |

## For AI Agents

### Working In This Directory
- Tests verify complete user workflows
- May require Zotero test environment
- Tests multiple modules working together

### Testing Requirements
- Run `npm run test:unit` from root
- May require extended test setup

### Common Patterns
- End-to-end data flow testing
- Mock multiple modules for integration

## Dependencies

### Internal
- All `src/*` modules - Tested in combination

### External
- Jest - Testing framework
- Zotero test environment

<!-- MANUAL: -->
