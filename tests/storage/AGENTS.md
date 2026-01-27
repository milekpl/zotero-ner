<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# storage

## Purpose
Unit tests for the data persistence layer. Tests localStorage operations for learned mappings and user preferences.

## Key Files
| File | Description |
|------|-------------|
| `data-manager.test.js` | Tests for data manager persistence |

## For AI Agents

### Working In This Directory
- Tests verify localStorage read/write operations
- Mock localStorage to avoid pollution
- Test data serialization and deserialization

### Testing Requirements
- Run `npm run test:unit` from root
- Mock localStorage: `global.localStorage = {...}`

### Common Patterns
- Mock storage methods: `getItem`, `setItem`, `removeItem`
- Test JSON parsing of stored data

## Dependencies

### Internal
- `src/storage/data-manager.js` - Source module being tested

### External
- Jest - Testing framework

<!-- MANUAL: -->
