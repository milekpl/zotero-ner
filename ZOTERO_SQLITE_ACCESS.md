# Zotero Direct SQLite Database Access

This document summarizes the essential information about accessing the Zotero SQLite database directly, based on the official documentation at https://www.zotero.org/support/dev/client_coding/direct_sqlite_database_access.

## Overview

The Zotero library data is stored in an SQLite database file named `zotero.sqlite` located within the Zotero data directory. This database can be accessed directly using standard SQLite clients, libraries, or third-party tools.

## Database Access Methods

### Direct File Access
- Database file: `zotero.sqlite`
- Location: Within the Zotero data directory
- Access: Using standard SQLite clients or libraries

### Programmatic Access
In Zotero extensions, use the built-in database APIs:
```javascript
// Execute SQL queries directly
const rows = await Zotero.DB.query(sqlQuery, params);

// Example: Get all creators
const query = `
  SELECT firstName, lastName, fieldMode, COUNT(*) as occurrenceCount
  FROM creators
  GROUP BY firstName, lastName, fieldMode
  ORDER BY occurrenceCount DESC
`;
const rows = await Zotero.DB.query(query);
```

## Database Schema Information

While the exact schema details are not publicly documented, the data model includes:

### Core Concepts
- Each bibliographic record has an "item type" (book, journal article, thesis, etc.)
- Records contain fields that depend on the item type
- Records can include user data such as:
  - Notes
  - Attachments (PDFs, snapshots) stored in separate subdirectories
  - Tags
  - Links to related items

### Tables (General Structure)
- `items` - Main bibliographic records
- `creators` - Author/editor/etc. information
- `itemCreators` - Junction table linking items to creators
- `collections` - User-defined collections
- `itemCollections` - Junction table linking items to collections
- `tags` - User-defined tags
- `itemTags` - Junction table linking items to tags

## Safe Practices for Database Access

### Critical Guidelines
1. **READ-ONLY ACCESS ONLY** - Never modify the database directly
2. **Avoid concurrent access** - Database modifications while Zotero is running can cause corruption
3. **Respect caching layers** - Zotero's caching breaks normal SQLite file-locking mechanisms
4. **Use Zotero APIs when possible** - Direct database access bypasses data validation

### Why These Restrictions Exist
- Zotero uses a caching layer that breaks SQLite file-locking mechanisms
- Direct modifications bypass Zotero's data validation and referential integrity checks
- Modifications can break Zotero sync and many functionality areas
- The database is designed as an internal format, with direct access being a secondary benefit

## Version Compatibility

- The SQLite database structure can change between Zotero releases
- Always test with the target Zotero version
- Consider version compatibility when developing tools

## Best Practices

### Field Naming
- Use internal names for item types and fields (as defined in the data schema)
- Avoid localized names which can vary by language

### Custom Data Storage
- Use the "Extra" field for adding custom information to records
- Avoid schema modifications which can break sync functionality

### Query Optimization
- Use efficient SQL queries with appropriate indexes
- Limit result sets when possible
- Group related queries into transactions for better performance

## Examples

### Get All Creators with Occurrence Counts
```javascript
const query = `
  SELECT firstName, lastName, fieldMode, COUNT(*) as occurrenceCount
  FROM creators
  GROUP BY firstName, lastName, fieldMode
  ORDER BY occurrenceCount DESC
`;
const rows = await Zotero.DB.query(query);
```

### Get Items with Creators
```javascript
const query = `
  SELECT i.itemID, i.key, i.libraryID, c.firstName, c.lastName, ic.orderIndex
  FROM items i
  JOIN itemCreators ic ON i.itemID = ic.itemID
  JOIN creators c ON ic.creatorID = c.creatorID
  WHERE i.libraryID = ?
  ORDER BY i.itemID, ic.orderIndex
`;
const rows = await Zotero.DB.query(query, [libraryID]);
```

## Important Notes

1. **Internal Format**: The database is designed as an internal format, with direct access being a secondary benefit for data extraction
2. **Schema Changes**: Structure can change between releases, requiring version compatibility consideration
3. **Validation Bypass**: Direct access bypasses Zotero's data validation mechanisms
4. **Sync Impact**: Modifications can break Zotero sync functionality
5. **Field Mappings**: Refer to the "CSL/Zotero Metadata Field Index" for internal names and mappings

This approach provides efficient access to all library data without the complexity of UI interactions, making it ideal for batch processing operations like name normalization.