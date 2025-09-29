# Zotero Web API v3

This document summarizes the essential information about the Zotero Web API v3, which can be used to interact with Zotero libraries programmatically. This approach offers an alternative to direct database access and complex extension logic.

## Overview

The Zotero Web API provides programmatic access to Zotero libraries over HTTP/HTTPS. It allows developers to:
- Read library data
- Create, update, and delete items
- Manage collections, tags, and searches
- Access attachments and notes
- Perform searches and filtering

The API is RESTful and returns data in JSON format by default.

## Authentication

### API Keys
To access private libraries or perform write operations, you need an API key:
1. Generate an API key at https://www.zotero.org/settings/keys
2. Each key can be associated with specific permissions (read/write access to user library and/or groups)
3. Include the API key in requests using the `Authorization` header or `key` parameter

### Public Access
Public libraries can be accessed without authentication:
- User libraries: Add `/publications` to the user ID/library ID
- Group libraries: Accessible to anyone by default

## Base URLs

### API Endpoint
```
https://api.zotero.org/
```

### User Libraries
```
https://api.zotero.org/users/{userID}/
```

### Group Libraries
```
https://api.zotero.org/groups/{groupID}/
```

## Common API Endpoints

### Get Library Items
```
GET /users/{userID}/items
GET /groups/{groupID}/items
```

### Get Specific Item
```
GET /users/{userID}/items/{itemKey}
GET /groups/{groupID}/items/{itemKey}
```

### Get Item Creators
Creators are included in the item data when requesting items with `format=json`:
```json
{
  "key": "ITEMKEY123",
  "version": 1234,
  "library": {
    "type": "user",
    "id": 123456,
    "name": "Username"
  },
  "data": {
    "key": "ITEMKEY123",
    "version": 1234,
    "itemType": "journalArticle",
    "title": "Article Title",
    "creators": [
      {
        "creatorType": "author",
        "firstName": "John",
        "lastName": "Smith"
      },
      {
        "creatorType": "author",
        "firstName": "Jane",
        "lastName": "Doe"
      }
    ],
    "date": "2023-01-01"
  }
}
```

### Search Items
```
GET /users/{userID}/items?q=search+terms
GET /groups/{groupID}/items?tag=tagname
```

## Data Formats

### JSON (Default)
Most requests return JSON data by default. Include `format=json` to be explicit:
```
GET /users/{userID}/items?format=json
```

### Atom
The API also supports Atom format, which is useful for RSS readers:
```
GET /users/{userID}/items?format=atom
```

## Rate Limiting and Best Practices

### Rate Limits
- 100 requests per minute for authenticated requests
- 300 requests per minute for public requests
- Exceeding limits results in 429 responses

### Best Practices
1. **Use Conditional Requests**: Include `If-Modified-Since` or `If-None-Match` headers
2. **Batch Requests**: Use the `itemKey` parameter to request multiple items at once
3. **Pagination**: Use `limit` and `start` parameters for large result sets
4. **Include Parameters**: Use `include` to specify which related data to include (e.g., `include=creators,tags`)
5. **Caching**: Cache responses when appropriate to reduce API load

## Request Parameters

### Filtering
- `q`: Search terms
- `tag`: Filter by tag
- `itemType`: Filter by item type
- `collection`: Filter by collection key
- `since`: Only items modified since a version number

### Pagination
- `limit`: Number of items per page (default: 50, max: 100)
- `start`: Starting position (0-indexed)

### Data Control
- `include`: Related data to include (creators, tags, children, etc.)
- `sort`: Sort field (dateAdded, dateModified, title, creator)
- `direction`: Sort direction (asc, desc)

## Response Headers

Important response headers include:
- `Total-Results`: Total number of matching items
- `Link`: Pagination links (next, prev, first, last)
- `Last-Modified-Version`: Library version number
- `ETag`: Entity tag for caching

## Examples

### Get All Items with Creators
```bash
curl -H "Zotero-API-Key: YOUR_API_KEY" \
  "https://api.zotero.org/users/YOUR_USER_ID/items?include=creators&limit=100"
```

### Get Items Modified Since Last Check
```bash
curl -H "Zotero-API-Key: YOUR_API_KEY" \
  "https://api.zotero.org/users/YOUR_USER_ID/items?since=1234&include=creators"
```

### Search for Items by Author
```bash
curl -H "Zotero-API-Key: YOUR_API_KEY" \
  "https://api.zotero.org/users/YOUR_USER_ID/items?q=Smith&include=creators"
```

### JavaScript Example
```javascript
async function getAllCreatorsFromZotero() {
  const userID = 'YOUR_USER_ID';
  const apiKey = 'YOUR_API_KEY';
  
  try {
    const response = await fetch(
      `https://api.zotero.org/users/${userID}/items?include=creators&limit=100`,
      {
        headers: {
          'Zotero-API-Key': apiKey
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const allCreators = [];
    
    data.forEach(item => {
      if (item.data && item.data.creators) {
        item.data.creators.forEach(creator => {
          allCreators.push({
            firstName: creator.firstName || '',
            lastName: creator.lastName || '',
            creatorType: creator.creatorType || 'author'
          });
        });
      }
    });
    
    return allCreators;
  } catch (error) {
    console.error('Error fetching creators from Zotero:', error);
    throw error;
  }
}
```

## Differences Between User and Group Libraries

### User Libraries
- Accessed via `/users/{userID}/`
- Require user-specific API keys
- Include publications (public items) accessible without authentication

### Group Libraries
- Accessed via `/groups/{groupID}/`
- May be public or private
- Private groups require group-specific API key permissions

## Error Handling

Common HTTP status codes:
- 200: Success
- 400: Bad Request (invalid parameters)
- 401: Unauthorized (missing or invalid API key)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (item or library doesn't exist)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

## Advantages of Web API Approach

1. **Simplicity**: No need to understand complex extension architecture
2. **Flexibility**: Can be used from any environment (web pages, scripts, etc.)
3. **Portability**: Works with online and local libraries
4. **Standard HTTP**: Familiar RESTful interface
5. **Authentication**: Clear API key management
6. **Rate Limiting**: Built-in protection against abuse

## Disadvantages of Web API Approach

1. **Network Dependency**: Requires internet connection (unless using local API)
2. **Rate Limits**: Limited to 100 requests per minute
3. **Latency**: Network requests are slower than direct database access
4. **Permissions**: Need explicit API key permissions
5. **Data Freshness**: May not reflect real-time changes

## When to Use Each Approach

### Web API
- Web-based applications
- Scripts that run periodically
- Applications that need to work with remote libraries
- Simple data extraction without complex UI integration

### Direct Database Access
- High-performance batch operations
- Real-time data processing
- Extensions that need deep Zotero integration
- Applications that work with local libraries only

This approach offers a clean, simple way to interact with Zotero libraries without the complexity of extension development, making it ideal for name normalization tasks that can be performed independently of the Zotero UI.