<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-25 | Updated: 2026-01-25 -->

# core

## Purpose
Name normalization processing modules. Handles name parsing, variant generation, similarity matching, candidate finding, and machine learning for author name normalization.

## Key Files
| File | Description |
|------|-------------|
| `name-parser.js` | Enhanced name component parsing (given names, surnames, initials) |
| `variant-generator.js` | Generates normalized name variations for matching |
| `learning-engine.js` | Stores learned mappings with Jaro-Winkler similarity algorithm |
| `candidate-finder.js` | Finds candidate matches from learned mappings |

## For AI Agents

### Working In This Directory
- Core modules are pure JavaScript (no Zotero dependencies)
- `item-processor.js` (in `src/zotero/`) is the main entry point that orchestrates these modules
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
