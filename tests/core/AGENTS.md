<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# core

## Purpose
Unit tests for core name normalization modules. Tests name parsing, variant generation, learning engine, candidate finding, and name equivalence.

## Key Files
| File | Description |
|------|-------------|
| `name-parser.test.js` | Tests for name component parsing |
| `variant-generator.test.js` | Tests for name variant generation |
| `learning-engine.test.js` | Tests for learning engine and similarity |
| `candidate-finder.test.js` | Tests for candidate matching |
| `given-name-equivalents.test.js` | Tests for given name equivalence |
| `name-constants.test.js` | Tests for name constants and configuration |
| `string-distance.test.js` | Tests for string distance algorithms |

## For AI Agents

### Working In This Directory
- Tests use Jest with mocks for storage dependencies
- Each test file corresponds to a source file in `src/core/`
- Use `describe()` for grouping related tests

### Testing Requirements
- Run `npm run test:unit` from root to execute
- Mock localStorage for `learning-engine.test.js`

### Common Patterns
- Test data: sample names and expected normalizations
- Mock storage: `jest.spyOn(localStorage, 'getItem')`

## Dependencies

### Internal
- `src/core/*` - Source modules being tested

### External
- Jest - Testing framework

<!-- MANUAL: -->
