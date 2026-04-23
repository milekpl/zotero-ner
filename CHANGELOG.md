# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4] - 2026-04-23

### Added

- Full localization support for the Zotero Name Normalizer UI.
  - Added runtime translation helper for dialog UI strings and tooltips.
  - Added Polish locale support in `_locales/pl/messages.json`.
  - Localized menu labels for author normalization and field normalization submenu items.
  - Localized field normalization dialog text, filters, buttons, progress labels, and alerts.
  - Added fallback placeholder substitution so `$1` tokens render correctly when browser i18n is unavailable.
- Updated documentation and locale metadata to describe `_locales/` support.

### Changed

- Refactored `content/dialog.html` to use the new `ZoteroNER_i18n` helper and translation keys.
- Refactored `content/scripts/zotero-ner.js` to load menu labels from the extension locale messages.
- Added missing Polish translations for all newly localizable dialog and menu strings.

## [1.3.2] - 2026-02-17

### Fixed

#### Field Normalization - Item Data Loading

- **Bug Fix**: Fixed "Item data not loaded" error in Location/Publisher/Journal normalization
  - Added defensive check for `item.isLoaded()` method existence (Zotero 7+ compatibility)
  - Added `item.loadDataType('primaryData')` call to ensure item data is loaded before field access
  - Added graceful error handling to skip problematic items and continue processing
  - Improved error messages with helpful guidance for users
  - Applied fixes to:
    - `processFieldItems()` - field value extraction
    - `applySelectedFieldNormalizations()` - batch apply operations
    - `applySingleFieldNormalization()` - individual apply operations
  - Added comprehensive unit tests for item data loading edge cases

#### Name Particle Handling

- **Bug Fix**: Fixed duplicate particles in names like "von Stuckrad, Kocku von"
  - When normalizing surnames with particles (von, van, de, etc.), the system now
    automatically cleans up misplaced particles from the given name field
  - Example: If stored as firstName="Kocku von", lastName="Stuckrad" and normalizing
    to "von Stuckrad", the result is now correctly "von Stuckrad, Kocku" instead of
    "von Stuckrad, Kocku von"
  - Supports particles: von, van, de, la, del, di, du, le, lo, da, des, dos, das, de la
  - Case-insensitive matching (e.g., "VON" → removed when normalizing to "von Stuckrad")
  - Handles multi-word particles like "de la"
  - Added comprehensive unit tests for particle cleanup scenarios

### Technical Details

- Items loaded via `Zotero.Items.getAll()` may be returned as stub objects without field data
- The fix checks if `isLoaded()` method exists before calling it (Zotero version compatibility)
- Primary data is loaded before calling `item.getField()` when needed
- Error handling allows processing to continue even if some items fail
- Users see helpful error messages suggesting they open items to load data
- Particle cleanup happens automatically during surname normalization - no second pass needed

## [1.3.1] - 2026-02-13

- **Bug Fix**: Fixed "Not in transaction" error when normalizing large numbers of field entries
  - Changed `item.save()` to `item.saveTx()` for proper transaction handling
  - Applied to FieldItemProcessor, FieldNormalizerDialog, and ZoteroDBAnalyzer


## [1.3.0] - 2026-02-13

### Added

#### Field Expansion Features

- **Publisher Normalization**: Support for normalizing publisher names with automatic variant generation
  - Separator normalization (; / & - and variations)
  - Abbreviation expansion (Inc., Ltd., Corp., Press)
  - Company name pattern recognition (Springer, Wiley, Elsevier, Taylor & Francis, etc.)
  - University press standardization (Oxford UP, Cambridge UP, etc.)

- **Location Normalization**: Support for normalizing location/place data
  - State abbreviation expansion/contraction (MA -> Massachusetts, Illinois -> IL)
  - Multi-location splitting (Boston, MA; Chicago, IL)
  - Support for all US states and DC
  - Canadian province abbreviations

- **Journal Normalization**: Support for normalizing journal/publication titles
  - Abbreviation expansion (J. -> Journal, Trans. -> Transactions)
  - Conjunction variations (of, and, in)
  - Title case normalization

- **FieldItemProcessor**: New processor for field normalization operations
  - Lazy-loaded field registry
  - Single item and batch processing
  - Progress callbacks
  - Learned mapping application

- **FieldNormalizerDialog**: UI component for field normalization
  - Support for publisher, location, and journal field types
  - Process items and check learned mappings
  - Present field-specific options
  - HTML demo rendering

### Changed

- Extended `VariantGenerator` with `FieldVariantGenerator` for field-specific patterns
- Extended `LearningEngine` with `ScopedLearningEngine` for collection scoping
- Updated field constants with new normalization patterns
- Improved factory pattern in `FieldNormalizer` for creating field-specific normalizers

### Tests

- Added `tests/core/field-normalizer.test.js` - Factory pattern and normalization tests
- Added `tests/core/field-variant-generator.test.js` - Variant generation tests
- Added `tests/config/field-constants.test.js` - Configuration tests
- Added `tests/zotero/field-item-processor.test.js` - Processor tests
- Added `tests/ui/field-normalizer-dialog.test.js` - Dialog tests
- Added `tests/integration/field-normalization.test.js` - Full workflow tests

## [1.2.1] - 2025-01-15

### Added

- Smart name normalization with `isUpperCaseName()` method
- Enhanced name parsing for consistently capitalized names
- Comprehensive test coverage for name normalization edge cases

## [1.2.0] - 2024-12-20

### Added

- Automatic update mechanism for the add-on
- Hash verification for update integrity
- Version checking against manifest

### Changed

- Updated build process for automatic versioning
- Improved update reliability with fallback URLs

## [1.1.0] - 2024-11-10

### Added

- Initial name normalization feature
- Variant generation for author names
- Learned mapping storage and retrieval
- UI dialog for name normalization

### Changed

- Refactored from name given-equivalents to full normalization system

## [1.0.0] - 2024-10-01

### Added

- Initial release of Zotero NER
- Basic name normalization functionality
- Integration with Zotero menu system

