<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# core

## Purpose
Unit tests for core NER processing modules. Tests name parsing, variant generation, learning engine, candidate finding, and GLINER handler.

## Key Files
| File | Description |
|------|-------------|
| `ner-processor.test.js` | Tests for main NER processor |
| `name-parser.test.js` | Tests for name component parsing |
| `variant-generator.test.js` | Tests for name variant generation |
| `learning-engine.test.js` | Tests for learning engine and similarity |
| `candidate-finder.test.js` | Tests for candidate matching |
| `gliner-handler.test.js` | Tests for GLINER integration |
| `given-name-equivalents.test.js` | Tests for given name equivalence |
| `index.test.js` | Tests for module exports |

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
