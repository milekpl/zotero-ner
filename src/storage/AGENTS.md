<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# storage

## Purpose
Data persistence layer for the name normalization extension. Handles localStorage-based storage of learned name mappings and user preferences.

## Key Files
| File | Description |
|------|-------------|
| `data-manager.js` | localStorage wrapper for persisting learned mappings and preferences |

## For AI Agents

### Working In This Directory
- Simple wrapper around browser localStorage API
- Stores learned normalizations and user preferences
- Data structure: JSON objects with source → target mappings

### Testing Requirements
- Tests in `tests/storage/` verify data persistence
- Mock localStorage in Jest tests

### Common Patterns
- Key prefixes to avoid collisions with other extensions
- JSON serialization for complex data structures
- Versioning for migration support

## Dependencies

### Internal
- None (standalone module)

### External
- Browser localStorage API

<!-- MANUAL: -->
