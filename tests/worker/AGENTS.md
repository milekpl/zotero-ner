<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# worker

## Purpose
Unit tests for the background worker module. Tests Web Worker message passing and processing behavior.

## Key Files
| File | Description |
|------|-------------|
| `ner-worker.test.js` | Tests for NER worker functionality |

## For AI Agents

### Working In This Directory
- Tests verify worker message handling
- Mock Worker constructor for testing
- Test both successful and error responses

### Testing Requirements
- Run `npm run test:unit` from root
- Mock Worker: `const Worker = { prototype: { onmessage: null } }`

### Common Patterns
- Message event simulation: `worker.onmessage({ data: ... })`
- Error propagation testing

## Dependencies

### Internal
- `src/worker/ner-worker.js` - Source module being tested
- `src/core/*` - Processing logic used by worker

### External
- Jest - Testing framework

<!-- MANUAL: -->
