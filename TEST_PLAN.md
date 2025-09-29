# Test Plan: Direct Database Connection Implementation

## Overview
This test plan outlines the testing strategy for implementing the direct database connection approach for the Zotero NER Author Name Normalizer extension.

## Test Categories

### 1. Unit Tests

#### Database Analyzer Tests
- [ ] `ZoteroDBAnalyzer.connect()` successfully connects to database
- [ ] `ZoteroDBAnalyzer.getAllCreators()` returns all creators from database
- [ ] `ZoteroDBAnalyzer.analyzeCreators()` correctly identifies variants
- [ ] `ZoteroDBAnalyzer` handles empty databases gracefully
- [ ] `ZoteroDBAnalyzer` handles database errors appropriately

#### Dialog Controller Tests
- [ ] `NormalizationDialogController.showDialog()` opens dialog with all creators
- [ ] `NormalizationDialogController` processes user selections correctly
- [ ] `NormalizationDialogController` applies normalizations to database
- [ ] `NormalizationDialogController` handles empty creator lists
- [ ] `NormalizationDialogController` handles processing errors

#### Menu Integration Tests
- [ ] Menu item is properly added to Tools menu
- [ ] Menu item handler calls database analyzer correctly
- [ ] Menu item shows dialog with all creators
- [ ] Menu item handles errors gracefully

### 2. Integration Tests

#### Database Integration Tests
- [ ] Database analyzer connects to real Zotero database
- [ ] Database analyzer extracts creators from real database
- [ ] Database analyzer analyzes real creator data
- [ ] Database analyzer handles different Zotero library types
- [ ] Database analyzer performs efficiently with large libraries

#### UI Integration Tests
- [ ] Dialog displays all creators from database
- [ ] Dialog allows selecting name variants
- [ ] Dialog processes user selections correctly
- [ ] Dialog applies normalizations to database
- [ ] Dialog handles learned mappings appropriately

#### Menu Integration Tests
- [ ] Menu item appears in Tools menu
- [ ] Menu item triggers database analysis
- [ ] Menu item opens dialog with all creators
- [ ] Menu item handles errors without crashing Zotero

### 3. UI Tests

#### Dialog UI Tests
- [ ] Dialog loads and displays basic elements
- [ ] Dialog shows all creators from database
- [ ] Dialog allows selecting name variants
- [ ] Dialog handles learned mappings appropriately
- [ ] Dialog displays progress indicators correctly
- [ ] Dialog shows confirmation messages
- [ ] Dialog handles empty creator lists
- [ ] Dialog closes properly after processing

#### Menu UI Tests
- [ ] Menu item appears in correct location
- [ ] Menu item has correct label and tooltip
- [ ] Menu item responds to clicks
- [ ] Menu item opens dialog correctly
- [ ] Menu item shows loading indicators

### 4. Performance Tests

#### Database Performance Tests
- [ ] Database queries complete within acceptable time limits
- [ ] Memory usage remains stable during analysis
- [ ] Large library processing doesn't freeze UI
- [ ] Database connections are properly closed

#### Dialog Performance Tests
- [ ] Dialog opens quickly with large creator lists
- [ ] Dialog remains responsive during processing
- [ ] Memory usage stays within limits
- [ ] Dialog closes cleanly without leaks

### 5. Error Handling Tests

#### Database Error Tests
- [ ] Database connection failures are handled gracefully
- [ ] Invalid database queries show appropriate errors
- [ ] Database read errors don't crash extension
- [ ] Database errors are logged properly

#### UI Error Tests
- [ ] Dialog initialization errors show user-friendly messages
- [ ] Processing errors are displayed to user
- [ ] UI errors don't crash Zotero
- [ ] Error recovery works correctly

#### Menu Error Tests
- [ ] Menu item errors don't crash Zotero
- [ ] Menu item shows error messages appropriately
- [ ] Menu item recovers from transient errors
- [ ] Menu item handles permanent errors gracefully

## Test Data

### Sample Creator Data
```javascript
const sampleCreators = [
  { firstName: 'John', lastName: 'Smith', fieldMode: 0, occurrenceCount: 5 },
  { firstName: 'J.', lastName: 'Smith', fieldMode: 0, occurrenceCount: 3 },
  { firstName: 'Jonathan', lastName: 'Smith', fieldMode: 0, occurrenceCount: 2 },
  { firstName: 'Jane', lastName: 'Doe', fieldMode: 0, occurrenceCount: 4 },
  { firstName: 'J.', lastName: 'Doe', fieldMode: 0, occurrenceCount: 1 },
  { firstName: '', lastName: 'van Dijk', fieldMode: 1, occurrenceCount: 3 },
  { firstName: 'Eva', lastName: 'van Dijk', fieldMode: 0, occurrenceCount: 2 }
];
```

### Expected Analysis Results
```javascript
const expectedResults = {
  totalUniqueSurnames: 3,
  totalVariantGroups: 2,
  suggestions: [
    {
      primary: 'Smith',
      variants: [
        { name: 'John Smith', frequency: 5, similarity: 1.0 },
        { name: 'J. Smith', frequency: 3, similarity: 0.9 },
        { name: 'Jonathan Smith', frequency: 2, similarity: 0.85 }
      ],
      recommendedNormalization: 'John Smith'
    },
    {
      primary: 'van Dijk',
      variants: [
        { name: 'van Dijk', frequency: 3, similarity: 1.0 },
        { name: 'Eva van Dijk', frequency: 2, similarity: 0.9 }
      ],
      recommendedNormalization: 'van Dijk'
    }
  ]
};
```

## Test Environment

### Supported Platforms
- [ ] Windows 10/11
- [ ] macOS 12+
- [ ] Ubuntu 20.04+

### Supported Zotero Versions
- [ ] Zotero 7.0.x

### Test Libraries
- [ ] Small library (10-50 items)
- [ ] Medium library (500-1000 items)
- [ ] Large library (5000+ items)
- [ ] Library with diverse creator formats
- [ ] Library with international names
- [ ] Library with Spanish double surnames
- [ ] Library with prefixes (van, de, la, etc.)

## Acceptance Criteria

### Functional Requirements
- [ ] Extension processes all creators in library
- [ ] Extension identifies name variants correctly
- [ ] Extension suggests appropriate normalizations
- [ ] Extension applies normalizations to database
- [ ] Extension handles learned mappings
- [ ] Extension shows progress during processing
- [ ] Extension handles errors gracefully

### Performance Requirements
- [ ] Database queries complete in < 5 seconds for 1000 items
- [ ] Dialog opens in < 2 seconds for 1000 creators
- [ ] Memory usage < 100MB during processing
- [ ] UI remains responsive during analysis

### Reliability Requirements
- [ ] No crashes during normal operation
- [ ] No data corruption in Zotero database
- [ ] Proper error handling for all failure modes
- [ ] Clean shutdown in all scenarios

### Usability Requirements
- [ ] Clear user interface
- [ ] Helpful error messages
- [ ] Appropriate progress indicators
- [ ] Consistent behavior across platforms

## Test Execution

### Automated Tests
- [ ] Unit tests run with Jest
- [ ] UI tests run with Playwright
- [ ] Integration tests run in simulated environment
- [ ] Performance tests measure key metrics
- [ ] Error handling tests verify resilience

### Manual Tests
- [ ] Install extension in fresh Zotero profile
- [ ] Verify menu item appears correctly
- [ ] Test with real Zotero libraries
- [ ] Verify dialog functionality
- [ ] Check error handling with invalid data
- [ ] Test with different library sizes

This comprehensive test plan ensures that the direct database connection implementation is thoroughly tested and reliable.