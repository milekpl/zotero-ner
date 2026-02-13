# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-02-09

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

- **Collection Scope**: Collection-based learned mapping limitation
  - Store mappings with collection scope
  - Retrieve scoped mappings with fallback to global
  - Get available scopes and clear scope data
  - Scope priority for items in multiple collections

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

