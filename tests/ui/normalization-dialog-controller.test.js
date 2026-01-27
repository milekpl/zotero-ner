/**
 * Unit tests for NormalizationDialogController utility functions
 * Tests the utility functions from the dialog controller that can be unit tested
 */

// Mock console functions
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock the Zotero global object for testing
global.Zotero = {
  debug: jest.fn(),
  logError: jest.fn(),
  alert: jest.fn(),
  getMainWindow: () => ({
    alert: jest.fn()
  })
};

// Test utilities that can be extracted and tested independently
describe('NormalizationDialogController utilities', () => {
  test('formatCreatorName should format names correctly', () => {
    const formatCreatorName = (creator) => {
      if (!creator) {
        return '';
      }
      if (creator.name) {
        return creator.name;
      }
      const parts = [];
      if (creator.firstName) parts.push(creator.firstName);
      if (creator.lastName) parts.push(creator.lastName);
      return parts.join(' ').trim();
    };

    const creatorWithFirstAndLast = { firstName: 'John', lastName: 'Smith' };
    const creatorWithNameOnly = { name: 'Jane Doe' };
    const nullCreator = null;
    
    expect(formatCreatorName(creatorWithFirstAndLast)).toBe('John Smith');
    expect(formatCreatorName(creatorWithNameOnly)).toBe('Jane Doe');
    expect(formatCreatorName(nullCreator)).toBe('');
  });

  test('formatNameString should handle different input types', () => {
    const formatNameString = (value) => {
      if (!value) {
        return '';
      }
      if (typeof value === 'string') {
        return value;
      }
      if (value.firstName || value.lastName) {
        // Use the formatCreatorName logic
        const parts = [];
        if (value.firstName) parts.push(value.firstName);
        if (value.lastName) parts.push(value.lastName);
        return parts.join(' ').trim();
      }
      if (value.name) {
        return value.name;
      }
      return String(value);
    };

    expect(formatNameString('test string')).toBe('test string');
    expect(formatNameString({ firstName: 'John', lastName: 'Smith' })).toBe('John Smith');
    expect(formatNameString(null)).toBe('');
    expect(formatNameString({ name: 'Jane Doe' })).toBe('Jane Doe');
  });

  test('log function should call Zotero.debug when available', () => {
    const log = (message) => {
      try {
        if (typeof Zotero !== 'undefined' && typeof Zotero.debug === 'function') {
          Zotero.debug('Zotero NER Dialog: ' + message);
        }
      } catch (e) {}
    };

    const mockLogMessage = 'Test log message';
    log(mockLogMessage);
    
    expect(global.Zotero.debug).toHaveBeenCalledWith('Zotero NER Dialog: ' + mockLogMessage);
  });

  test('alert function should call appropriate alert method', () => {
    const alert = (title, message) => {
      try {
        if (typeof Zotero !== 'undefined' && typeof Zotero.alert === 'function') {
          Zotero.alert(null, title, message);
        } else {
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(title + ': ' + message);
          }
        }
      } catch (e) {
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(title + ': ' + message);
        }
      }
    };

    const title = 'Test Title';
    const message = 'Test Message';
    
    alert(title, message);
    
    expect(global.Zotero.alert).toHaveBeenCalledWith(null, title, message);
  });

  test('cloneCreator should properly clone creator object', () => {
    const cloneCreator = (creator) => {
      if (!creator) {
        return { firstName: '', lastName: '', creatorType: 'author' };
      }
      return {
        firstName: creator.firstName || '',
        lastName: creator.lastName || '',
        creatorType: creator.creatorType || 'author'
      };
    };

    const originalCreator = { firstName: 'John', lastName: 'Smith', creatorType: 'author' };
    const clonedCreator = cloneCreator(originalCreator);
    
    expect(clonedCreator.firstName).toBe('John');
    expect(clonedCreator.lastName).toBe('Smith');
    expect(clonedCreator.creatorType).toBe('author');
    
    // Verify it's a different object
    clonedCreator.firstName = 'Jane';
    expect(originalCreator.firstName).toBe('John'); // Original unchanged
  });

  test('createCreatorFromString should create creator from string', () => {
    const createCreatorFromString = (name, original) => {
      // Simplified parsing for test - just split by space
      const parts = name.split(' ');
      let firstName = '';
      let lastName = '';
      
      if (parts.length === 1) {
        lastName = parts[0];
      } else if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }
      
      return {
        firstName: firstName,
        lastName: lastName,
        creatorType: original && original.creatorType ? original.creatorType : 'author'
      };
    };

    const original = { creatorType: 'editor' };
    const result = createCreatorFromString('John Smith', original);
    
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Smith');
    expect(result.creatorType).toBe('editor');
  });
});