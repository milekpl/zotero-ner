# Zotero NER Author Name Normalizer - Direct Database Connection Specification

## Overview

This specification defines the implementation of a direct database connection approach for the Zotero NER Author Name Normalizer extension. The approach will connect directly to the Zotero SQLite database to process all creators in the library, eliminating the complexity of UI selection and dialog contexts.

## Goals

1. **Eliminate UI Selection Complexity**: Remove all code related to selected items in the library
2. **Direct Database Connection**: Connect directly to the Zotero SQLite database for efficient batch processing
3. **Single Entry Point**: Provide one simple menu entry for name normalization
4. **Remove Toolbar Button**: Eliminate the toolbar button to simplify the UI
5. **Modular Architecture**: Design components to be reusable with both SQLite and Web API data sources
6. **Unified Dialog Interface**: Use the same dialog widgets for both data sources

## Architecture Overview

```
+---------------------+
|   Main Menu Entry   |
+----------+----------+
           |
           v
+---------------------+
|  Database Analyzer  |<--->+------------------+
| (SQLite/Web API)    |     | Learning Engine  |
+----------+----------+     +---------+--------+
           |                          |
           v                          v
+---------------------+     +------------------+
| Normalization       |     | Data Mapper      |
| Dialog Controller   |<--->| (Variant Gen)    |
+----------+----------+     +---------+--------+
           |                          |
           v                          v
+---------------------+     +------------------+
| Dialog UI Widgets   |     | Name Parser      |
| (Reusable)          |<--->| (Core Logic)     |
+---------------------+     +------------------+
```

## Core Components

### 1. Database Analyzer (Core Component)
**Purpose**: Connect directly to Zotero data source and extract all creators

**Interfaces**:
```javascript
class ZoteroDataAnalyzer {
  // Initialize the analyzer with data source type
  constructor(dataSource = 'sqlite') // or 'webapi'
  
  // Connect to the data source
  async connect(options)
  
  // Extract all creators from the data source
  async extractAllCreators()
  
  // Analyze creators for variants and inconsistencies
  async analyzeCreators(creators)
  
  // Get statistics about the data source
  async getDataSourceStats()
  
  // Close connection
  async disconnect()
}
```

**Implementation Details**:
- **SQLite Mode**: Connect to `zotero.sqlite` using Zotero.DB APIs
- **Web API Mode**: Connect to `https://api.zotero.org` using HTTP requests
- Both modes return the same data structure for downstream processing

### 2. Normalization Dialog Controller (UI Component)
**Purpose**: Manage the normalization dialog workflow

**Interfaces**:
```javascript
class NormalizationDialogController {
  // Initialize with data analyzer
  constructor(dataAnalyzer)
  
  // Show the normalization dialog with all creators
  async showDialog()
  
  // Process user selections and apply normalizations
  async processUserSelections(selections)
  
  // Apply normalizations to the data source
  async applyNormalizations(normalizations)
  
  // Save learned mappings
  async saveLearnedMappings(mappings)
}
```

### 3. Dialog UI Widgets (Reusable Component)
**Purpose**: Provide reusable UI components for displaying and interacting with normalization data

**Interfaces**:
```javascript
class DialogUIWidgets {
  // Create creator display widget
  createCreatorWidget(creatorData)
  
  // Create variant selection widget
  createVariantWidget(variants)
  
  // Create batch processing controls
  createBatchControls()
  
  // Create progress indicator
  createProgressIndicator()
  
  // Handle user interactions
  handleUserInteraction(event)
}
```

### 4. Data Mapper (Core Component)
**Purpose**: Generate name variants and map inconsistencies

**Interfaces**:
```javascript
class DataMapper {
  // Generate variants for a creator name
  generateVariants(creator)
  
  // Find similar names using similarity algorithms
  findSimilarNames(creator, allCreators)
  
  // Apply learned mappings
  applyLearnedMappings(creator, mappings)
  
  // Suggest normalizations
  suggestNormalizations(creator, variants, similars)
}
```

### 5. Name Parser (Core Component)
**Purpose**: Parse and normalize individual name components

**Interfaces**:
```javascript
class NameParser {
  // Parse a full name into components
  parse(fullName)
  
  // Normalize a parsed name
  normalize(parsedName)
  
  // Handle special cases (prefixes, suffixes, etc.)
  handleSpecialCases(parsedName)
  
  // Generate canonical form
  generateCanonical(parsedName)
}
```

## Data Flow

### 1. Initialization
1. User selects "Normalize Author Names" from Tools menu
2. Extension initializes Database Analyzer with SQLite mode
3. Database Analyzer connects to Zotero SQLite database

### 2. Data Extraction
1. Database Analyzer extracts all creators from the database
2. Creators are grouped by surname for analysis
3. Variants and inconsistencies are identified
4. Results are prepared for dialog presentation

### 3. Dialog Presentation
1. Normalization Dialog Controller receives analysis results
2. Dialog UI Widgets create the interface
3. User reviews suggested normalizations
4. User makes selections and confirms changes

### 4. Application
1. Normalization Dialog Controller processes user selections
2. Changes are applied to the data source
3. Learned mappings are saved for future use
4. User is notified of completion

## Data Structures

### Creator Object
```javascript
{
  id: string,           // Unique identifier
  firstName: string,    // First name component
  lastName: string,     // Last name component
  fieldMode: number,    // 0 = two-field, 1 = single-field
  itemType: string,     // Type of item (book, journalArticle, etc.)
  itemCount: number,    // Number of items this creator appears on
  libraryID: number     // Library this creator belongs to
}
```

### Variant Object
```javascript
{
  name: string,         // The variant name
  frequency: number,    // How often this variant appears
  similarity: number,   // Similarity score to primary form (0-1)
  confidence: number,   // Confidence in this being a variant (0-1)
  context: object       // Additional context information
}
```

### Normalization Suggestion
```javascript
{
  original: Creator,    // Original creator object
  primary: string,      // Primary (canonical) form
  variants: [Variant],  // List of identified variants
  similars: [Variant],  // List of similar names from learning engine
  recommended: string,  // Recommended normalization
  userSelected: string   // User-selected normalization (if any)
}
```

## Menu Integration

### Single Menu Entry
- **Location**: Tools menu
- **Label**: "Normalize Author Names"
- **Function**: Triggers full library analysis and normalization dialog

### Removed Elements
- Toolbar button (was causing UI context issues)
- Context menu items (unnecessary complexity)
- Multiple entry points (simplified to one)

## Modular Design for Multiple Data Sources

### Common Interface
All data analyzers implement the same interface:
```javascript
interface DataSourceAnalyzer {
  async connect(options)
  async extractAllCreators()
  async analyzeCreators(creators)
  async applyNormalizations(normalizations)
  async disconnect()
}
```

### SQLite Implementation
```javascript
class SQLiteAnalyzer extends DataSourceAnalyzer {
  async connect() {
    // Connect using Zotero.DB APIs
  }
  
  async extractAllCreators() {
    // Query zotero.sqlite directly
    const query = `
      SELECT c.firstName, c.lastName, c.fieldMode, 
             COUNT(ci.itemID) as itemCount,
             i.libraryID
      FROM creators c
      JOIN itemCreators ci ON c.creatorID = ci.creatorID
      JOIN items i ON ci.itemID = i.itemID
      GROUP BY c.firstName, c.lastName, c.fieldMode, i.libraryID
      ORDER BY itemCount DESC
    `;
    return await Zotero.DB.query(query);
  }
}
```

### Web API Implementation
```javascript
class WebAPIAnalyzer extends DataSourceAnalyzer {
  async connect(options) {
    // Connect using API key and user ID
    this.apiKey = options.apiKey;
    this.userID = options.userID;
  }
  
  async extractAllCreators() {
    // Query https://api.zotero.org/users/{userID}/items
    const response = await fetch(
      `https://api.zotero.org/users/${this.userID}/items?include=creators&limit=100`,
      {
        headers: {
          'Zotero-API-Key': this.apiKey
        }
      }
    );
    // Process response and extract creators
    return this.processAPIResponse(response);
  }
}
```

## Unified Dialog Interface

### Same UI Components
- Creator display widgets
- Variant selection controls
- Batch processing options
- Progress indicators
- Confirmation dialogs

### Data Agnostic
- UI components work with any data source
- Consistent user experience regardless of backend
- Easy to switch between SQLite and Web API modes

## Implementation Phases

### Phase 1: Core Infrastructure
1. Implement SQLite Database Analyzer
2. Create basic dialog controller
3. Develop reusable UI widgets
4. Implement name parsing and variant generation

### Phase 2: Dialog Interface
1. Build complete normalization dialog
2. Implement user interaction handling
3. Add batch processing capabilities
4. Integrate learning engine

### Phase 3: Menu Integration
1. Add single menu entry
2. Remove toolbar button
3. Remove context menu items
4. Implement proper error handling

### Phase 4: Web API Support
1. Implement Web API analyzer
2. Ensure compatibility with existing UI
3. Add API key configuration
4. Test cross-platform functionality

### Phase 5: Testing and Validation
1. Unit tests for all components
2. Integration tests with SQLite
3. Integration tests with Web API
4. UI tests for dialog interface

## Error Handling

### Database Connection Errors
- Graceful fallback to error messages
- Clear user guidance for resolution
- Logging for debugging purposes

### Data Processing Errors
- Individual item error handling
- Batch processing continuation
- Recovery mechanisms

### UI Errors
- Dialog initialization safeguards
- User-friendly error messages
- Automatic cleanup on errors

## Configuration Options

### Data Source Selection
- SQLite (local database)
- Web API (remote access)
- Auto-detect based on context

### Processing Preferences
- Confidence thresholds
- Batch sizes
- Learning engine settings

### UI Preferences
- Display options
- Confirmation requirements
- Progress reporting

## Future Enhancements

### Advanced Features
- Library-specific processing
- Collection filtering
- Date range filtering
- Tag-based filtering

### Performance Improvements
- Incremental processing
- Caching mechanisms
- Parallel processing

### Integration Points
- Export/import of learned mappings
- Collaboration features
- Sync with external services

This specification provides a clean, modular approach to implementing the direct database connection while maintaining flexibility for future enhancements and alternative data sources.