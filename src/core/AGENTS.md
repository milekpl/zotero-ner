<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# core

## Purpose
Core NER (Named Entity Recognition) processing modules. Handles name parsing, variant generation, similarity matching, candidate finding, and machine learning for name normalization.

## Key Files
| File | Description |
|------|-------------|
| `ner-processor.js` | Main NER processing orchestrator - name parsing and similarity matching |
| `name-parser.js` | Enhanced name component parsing (given names, surnames, initials) |
| `variant-generator.js` | Generates normalized name variations for matching |
| `learning-engine.js` | Stores learned mappings with Jaro-Winkler similarity algorithm |
| `candidate-finder.js` | Finds candidate matches from learned mappings |
| `gliner-handler.js` | GLINER NER model interface (ONNX.js) for future use |

## For AI Agents

### Working In This Directory
- Core modules are pure JavaScript (no Zotero dependencies)
- `ner-processor.js` is the main entry point for NER operations
- `learning-engine.js` handles persistence of user-learned normalizations
- Similarity algorithms: Jaro-Winkler, LCS (Longest Common Subsequence), initial matching

### Testing Requirements
- Tests in `tests/core/` mirror this directory structure
- Each module has corresponding test file: `*.test.js`

### Common Patterns
- Name parsing: components are parsed into `{ givenNames, surname, initials, prefix, suffix }`
- Variant generation: produces multiple normalization candidates
- Learning system: stores `source → target` mappings in localStorage with similarity thresholds

## Dependencies

### Internal
- `src/storage/data-manager.js` - For persisting learned mappings

### External
- None (pure JavaScript utilities)

<!-- MANUAL: -->
