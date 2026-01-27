<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# worker

## Purpose
Background worker module for intensive NER processing. Offloads computationally expensive operations from the main thread to prevent UI blocking.

## Key Files
| File | Description |
|------|-------------|
| `ner-worker.js` | Web Worker for background NER processing |

## For AI Agents

### Working In This Directory
- Uses Web Worker API for background processing
- Handles CPU-intensive name parsing and similarity calculations
- Message-based communication with main thread

### Testing Requirements
- Tests in `tests/worker/` verify worker functionality
- Mock Worker constructor in Jest tests

### Common Patterns
- Message passing: `{ type: 'process', data: ... }` → `{ type: 'result', data: ... }`
- Error handling: propagate errors back to main thread

## Dependencies

### Internal
- `src/core/*` - For name processing logic (imported in worker scope)

### External
- Web Worker API - Browser background worker support

<!-- MANUAL: -->
