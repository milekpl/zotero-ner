/**
 * Zotero DB Analyzer - Handles database-specific queries for name analysis
 * This module uses Zotero's database APIs to efficiently extract and analyze names
 */

const { NAME_PREFIXES, NAME_SUFFIXES, COMMON_GIVEN_NAME_EQUIVALENTS: SHARED_NAME_EQUIVALENTS } = require('../config/name-constants');
const { normalizedLevenshtein, isDiacriticOnlyVariant, normalizeName } = require('../utils/string-distance');

// File-based logger for debugging (writes to /tmp/zotero-normalizer.log)
function fileLog(msg) {
  try {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const line = timestamp + ' [db-analyzer] ' + msg + '\n';
    if (typeof Components !== 'undefined') {
      // Firefox/XUL context - use nsIFileOutputStream
      const file = Components.classes['@mozilla.org/file/directory_service;1']
        .getService(Components.interfaces.nsIProperties)
        .get('TmpD', Components.interfaces.nsIFile);
      file.append('zotero-normalizer.log');
      const fos = Components.classes['@mozilla.org/network/file-output-stream;1']
        .createInstance(Components.interfaces.nsIFileOutputStream);
      fos.init(file, 0x02 | 0x08 | 0x10, 0o644, 0); // WRONLY | CREATE | APPEND
      fos.write(line, line.length);
      fos.close();
    }
    // Also log to Zotero.debug
    if (typeof Zotero !== 'undefined' && Zotero.debug) {
      Zotero.debug('NER-DB: ' + msg);
    }
  } catch (e) {
    // Fallback to console
    if (typeof console !== 'undefined' && console.log) {
      console.log('NER-DB: ' + msg);
    }
  }
}

const COMMON_GIVEN_NAME_EQUIVALENTS = Object.freeze({
  alex: 'alexander',
  alexander: 'alexander',
  alexandra: 'alexandra',
  alexis: 'alexander',
  ally: 'allison',
  ann: 'anne',
  anna: 'anne',
  annie: 'anne',
  anthony: 'anthony',
  antonio: 'antonio',
  beth: 'elizabeth',
  betsy: 'elizabeth',
  betty: 'elizabeth',
  bill: 'william',
  billy: 'william',
  bob: 'robert',
  bobby: 'robert',
  charles: 'charles',
  charlie: 'charles',
  charlotte: 'charlotte',
  chaz: 'charles',
  che: 'ernesto',
  chuck: 'charles',
  cathy: 'catherine',
  catherine: 'catherine',
  cathie: 'catherine',
  cathryn: 'catherine',
  frank: 'francis',
  francis: 'francis',
  francisco: 'francisco',
  fran: 'francis',
  frederic: 'frederick',
  frederick: 'frederick',
  fred: 'frederick',
  freddie: 'frederick',
  freddy: 'frederick',
  harold: 'harold',
  harry: 'harry',
  hal: 'harold',
  hank: 'henry',
  henry: 'henry',
  jack: 'john',
  jacob: 'jacob',
  jake: 'jacob',
  james: 'james',
  jamie: 'james',
  jen: 'jennifer',
  jenn: 'jennifer',
  jenny: 'jennifer',
  jennifer: 'jennifer',
  jesse: 'jessica',
  jess: 'jessica',
  jessica: 'jessica',
  jim: 'james',
  jimmy: 'james',
  joe: 'joseph',
  joey: 'joseph',
  john: 'john',
  jon: 'jonathan',
  jonathan: 'jonathan',
  jose: 'jose',
  joseph: 'joseph',
  joyce: 'joyce',
  kate: 'katherine',
  katherine: 'katherine',
  kathy: 'catherine',
  katy: 'katherine',
  katie: 'katherine',
  liz: 'elizabeth',
  lizzie: 'elizabeth',
  lou: 'louis',
  louis: 'louis',
  maggie: 'margaret',
  margaret: 'margaret',
  marie: 'mary',
  mary: 'mary',
  megan: 'margaret',
  meg: 'margaret',
  michael: 'michael',
  mick: 'michael',
  mickey: 'michael',
  mike: 'michael',
  manuel: 'manuel',
  manu: 'manuel',
  nancy: 'anne',
  nick: 'nicholas',
  nicholas: 'nicholas',
  nico: 'nicholas',
  paco: 'francisco',
  patricia: 'patricia',
  patty: 'patricia',
  peggy: 'margaret',
  pepe: 'jose',
  rick: 'richard',
  rich: 'richard',
  richard: 'richard',
  ricky: 'richard',
  rob: 'robert',
  robbie: 'robert',
  robert: 'robert',
  ron: 'ronald',
  ronnie: 'ronald',
  ronald: 'ronald',
  rose: 'rose',
  rosie: 'rose',
  sasha: 'alexander',
  sandy: 'alexander',
  ted: 'theodore',
  teddy: 'theodore',
  theodore: 'theodore',
  toni: 'antonio',
  tonya: 'antonia',
  will: 'william',
  willie: 'william',
  william: 'william'
});
class ZoteroDBAnalyzer {
  constructor() {
    this.candidateFinder = new (require('../core/candidate-finder.js'))();
    this.learningEngine = new (require('../core/learning-engine.js'))();
  }

  /**
   * Perform a database-wide analysis of creator names
   * In a Zotero context, this would execute efficient SQL queries
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeFullLibrary(progressCallback = null, shouldCancel = null) {
    const DEBUG = true;
    const log = (msg) => {
      if (DEBUG) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const line = timestamp + ' ANALYZER: ' + msg;
        console.error(line);
      }
    };

    fileLog('analyzeFullLibrary started');
    log('analyzeFullLibrary started');
    if (typeof Zotero === 'undefined') {
      log('ERROR: Zotero is undefined');
      fileLog('ERROR: Zotero is undefined');
      throw new Error('This method must be run in the Zotero context');
    }

    console.log('Starting full library analysis...');

    try {
      // Use Zotero.Search API to get all items with creators
      const libraryID = Zotero.Libraries.userLibraryID;
      fileLog('Creating search for libraryID: ' + libraryID);
      log('Creating search for libraryID: ' + libraryID);
      const search = new Zotero.Search();
      search.addCondition('libraryID', 'is', libraryID);

      const itemIDs = await search.search();
      fileLog('Search returned ' + (itemIDs ? itemIDs.length : 0) + ' item IDs');
      log('Search returned ' + (itemIDs ? itemIDs.length : 0) + ' item IDs');
      console.log(`Found ${itemIDs.length} total items in library`);

      if (!itemIDs || itemIDs.length === 0) {
        console.log('No items found in library');
        fileLog('No items found in library - returning empty');
        return {
          surnameFrequencies: {},
          potentialVariants: [],
          suggestions: [],
          totalUniqueSurnames: 0,
          totalVariantGroups: 0
        };
      }

      // Process items in batches to avoid memory issues
      const filterBatchSize = 200;
      const processingBatchSize = 100;
      const creatorsMap = {};
      const itemsWithCreators = [];
      let processedItems = 0;

      // First pass: filter items with creators and populate creatorsMap
      for (let i = 0; i < itemIDs.length; i += filterBatchSize) {
        const batch = itemIDs.slice(i, i + filterBatchSize);
        const items = await Zotero.Items.getAsync(batch);

        for (const item of items) {
          try {
            const creators = item.getCreators ? item.getCreators() : [];
            if (creators && Array.isArray(creators) && creators.length > 0) {
              // Double-check that creators have actual names
              const validCreators = creators.filter(creator =>
                creator && (creator.firstName || creator.lastName)
              );
              if (validCreators.length > 0) {
                itemsWithCreators.push(item);
              }

              for (const creator of creators) {
                this.addCreatorOccurrence(creatorsMap, creator, item);
              }
            }
          } catch (itemError) {
            console.warn('Error processing item creators:', itemError);
          }
        }

        // Report progress
        if (progressCallback) {
          progressCallback({
            stage: 'filtering_items',
            processed: i + batch.length,
            total: itemIDs.length,
            percent: Math.round(((i + batch.length) / itemIDs.length) * 100)
          });
        }
      }

      Zotero.debug('ZoteroDBAnalyzer: Filtering complete, items with creators: ' + itemsWithCreators.length);
      fileLog('Filtering complete: itemsWithCreators=' + itemsWithCreators.length + ', creatorsMap keys=' + Object.keys(creatorsMap).length);
      console.log(`Found ${itemsWithCreators.length} items with valid creators`);

      if (itemsWithCreators.length === 0) {
        console.log('WARNING: No items with valid creators found!');
        console.log('This might indicate:');
        console.log('1. Items exist but have no creators');
        console.log('2. Creator data is malformed');
        console.log('3. Search conditions are too restrictive');

        // Fallback: Try to get some items without creator filter to verify search works
        console.log('Trying fallback search to verify database access...');
        const fallbackSearch = new Zotero.Search();
        fallbackSearch.addCondition('libraryID', 'is', Zotero.Libraries.userLibraryID);
        fallbackSearch.addCondition('limit', 'is', 10); // Just get 10 items

        try {
          const fallbackItemIDs = await fallbackSearch.search();
          if (fallbackItemIDs && fallbackItemIDs.length > 0) {
            const fallbackItems = await Zotero.Items.getAsync(fallbackItemIDs);
            console.log(`Fallback found ${fallbackItems.length} items`);

            for (const item of fallbackItems.slice(0, 3)) {
              try {
                const creators = item.getCreators ? item.getCreators() : [];
                console.log(`Item "${item.getField ? item.getField('title') : 'Unknown'}" has ${creators.length} creators:`, creators);
              } catch (e) {
                console.log('Error getting creators for item:', e);
              }
            }
          } else {
            console.log('Fallback search also found no items');
          }
        } catch (fallbackError) {
          console.error('Fallback search failed:', fallbackError);
        }
        Zotero.debug('ZoteroDBAnalyzer: No items with creators found, fallback search initiated');
      }

      const creators = Object.values(creatorsMap);
      Zotero.debug('ZoteroDBAnalyzer: Extracted ' + creators.length + ' unique creators');
      console.log(`Found ${creators.length} unique creator combinations`);

      // Debug: Show some sample creators
      if (creators.length > 0) {
        Zotero.debug('ZoteroDBAnalyzer: Sample creators: ' + JSON.stringify(creators.slice(0, 3))); // Log first 3 for brevity
        console.log('Sample creators:', creators.slice(0, 5));
      } else {
        Zotero.debug('ZoteroDBAnalyzer: WARNING - No creators extracted at all');
        console.log('WARNING: No creators found! This indicates an issue with creator extraction.');
      }

      Zotero.debug('ZoteroDBAnalyzer: Starting analyzeCreators with ' + creators.length + ' creators');
      fileLog('Calling analyzeCreators with ' + creators.length + ' creators');

      // Check learning engine state
      if (this.learningEngine) {
        fileLog('LearningEngine distinctPairs size: ' + (this.learningEngine.distinctPairs ? this.learningEngine.distinctPairs.size : 'unknown'));
        try {
          const distinctCount = this.learningEngine.distinctPairs ? this.learningEngine.distinctPairs.size : 0;
          fileLog('Distinct pairs in learning engine: ' + distinctCount);
          if (distinctCount > 0) {
            fileLog('Sample distinct pairs: ' + JSON.stringify([...this.learningEngine.distinctPairs.keys()].slice(0, 5)));
          }
        } catch(e) {
          fileLog('Error checking distinctPairs: ' + e.message);
        }
      } else {
        fileLog('LearningEngine is NULL');
      }

      // Analyze creators for surname frequencies and variants
      const results = await this.analyzeCreators(creators, progressCallback, shouldCancel);
      Zotero.debug('ZoteroDBAnalyzer: analyzeCreators completed, suggestions count: ' + (results.suggestions ? results.suggestions.length : 0));
      fileLog('analyzeCreators complete: suggestions=' + (results.suggestions ? results.suggestions.length : 0) + ', totalUniqueSurnames=' + results.totalUniqueSurnames);

      console.log(`Analysis complete: processed ${creators.length} unique creator entries`);
      return results;

    } catch (error) {
      console.error('Error in database analysis:', error);
      if (error.message === 'Analysis cancelled') {
        throw error;
      }
      // Fallback: return empty results instead of throwing
      return {
        surnameFrequencies: {},
        potentialVariants: [],
        suggestions: [],
        totalUniqueSurnames: 0,
        totalVariantGroups: 0
      };
    }
  }

  addCreatorOccurrence(creatorsMap, creator, item) {
    if (!creator || (!creator.firstName && !creator.lastName)) {
      return;
    }

    const key = `${creator.firstName || ''}|${creator.lastName || ''}|${creator.fieldMode || 0}`;
    if (!creatorsMap[key]) {
      const parsed = this.parseName(`${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.lastName || '');
      creatorsMap[key] = {
        key,
        firstName: creator.firstName || '',
        lastName: creator.lastName || '',
        fieldMode: creator.fieldMode || 0,
        count: 0,
        items: [],
        parsedName: parsed
      };
    }

    creatorsMap[key].count = (creatorsMap[key].count || 0) + 1;

    if (item) {
      const summary = this.buildItemSummary(item, creator);
      if (summary) {
        const limit = 25;
        if ((creatorsMap[key].items || []).length < limit) {
          creatorsMap[key].items.push(summary);
        }
      }
    }
  }

  buildItemSummary(item, forCreator = null) {
    if (!item) {
      return null;
    }

    try {
      const getField = typeof item.getField === 'function' ? item.getField.bind(item) : null;
      const title = getField ? getField('title') : (item.title || '');
      const date = getField ? getField('date') : (item.date || '');
      const publicationYear = this.extractYear(date);
      const creators = typeof item.getCreators === 'function' ? (item.getCreators() || []) : [];

      // Extract first author info (most common case) or the specific creator
      let firstAuthorFirstName = '';
      let firstAuthorLastName = '';

      if (creators.length > 0) {
        // Use the provided creator if specified, otherwise use first author
        const creator = forCreator || creators[0];
        if (creator) {
          firstAuthorFirstName = creator.firstName || '';
          firstAuthorLastName = creator.lastName || '';
        }
      }

      return {
        id: item.id || null,
        key: item.key || null,
        title: title || 'Untitled',
        date: date || '',
        year: publicationYear,
        itemType: item.itemType || (getField ? getField('itemType') : ''),
        creatorsCount: creators.length,
        authorFirstName: firstAuthorFirstName,
        authorLastName: firstAuthorLastName,
        // Full author string for display
        author: this.buildAuthorString(firstAuthorFirstName, firstAuthorLastName)
      };
    } catch (summaryError) {
      console.warn('Unable to summarize item for creator mapping:', summaryError);
      return null;
    }
  }

  buildAuthorString(firstName, lastName) {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (first && last) {
      return `${first} ${last}`;
    } else if (last) {
      return last;
    } else if (first) {
      return first;
    }
    return '';
  }

  /**
   * Find items for authors with a specific surname variant
   * @param {Object} itemsByFullAuthor - Items keyed by "firstName|lastName"
   * @param {string} surname - The surname to match (e.g., "Martin", "Martín")
   * @returns {Array} Array of items from authors with that surname
   */
  findItemsBySurname(itemsByFullAuthor, surname) {
    if (!surname || !itemsByFullAuthor) {
      return [];
    }

    const items = [];
    const normalizedSurname = surname.toLowerCase().trim();

    for (const [authorKey, authorItems] of Object.entries(itemsByFullAuthor)) {
      // Parse the author key (format: "firstName|lastName")
      const lastNameMatch = authorKey.match(/\|([^|]+)$/);
      if (lastNameMatch) {
        const authorLastName = lastNameMatch[1].trim().toLowerCase();
        // Match exact surname (case-insensitive) to avoid matching "Martin" with "Martinez"
        if (authorLastName === normalizedSurname) {
          if (Array.isArray(authorItems)) {
            items.push(...authorItems);
          }
        }
      }
    }

    // Sort items by author name for consistent display
    items.sort((a, b) => {
      const authorA = (a.author || '').toLowerCase();
      const authorB = (b.author || '').toLowerCase();
      return authorA.localeCompare(authorB);
    });

    return items;
  }

  /**
   * Find items for a specific author (firstName + lastName)
   * Used for surname variant suggestions to avoid mixing different authors
   * Case-insensitive matching for robustness
   * @param {Object} itemsByFullAuthor - Items keyed by "firstName|lastName"
   * @param {string} firstName - The author's first name (can be empty for malformed entries)
   * @param {string} lastName - The author's last name
   * @returns {Array} Array of items from this specific author
   */
  findItemsByFullAuthorName(itemsByFullAuthor, firstName, lastName) {
    // lastName is required, but firstName can be empty (for malformed entries like "and Friston")
    if (!lastName || !itemsByFullAuthor) {
      return [];
    }

    const normalizedFirst = (firstName || '').trim().toLowerCase();
    // Use exact raw lastName for lookup (don't normalize)
    const variantLastName = lastName.trim();
    
    // Debug: Log what we're searching for
    fileLog('findItemsByFullAuthorName: searching for firstName="' + firstName + '" lastName="' + lastName + '"');
    fileLog('  normalizedFirst="' + normalizedFirst + '" variantLastName="' + variantLastName + '"');
    fileLog('  itemsByFullAuthor has ' + Object.keys(itemsByFullAuthor).length + ' keys');
    
    // Debug: Log first few keys to see the format
    const sampleKeys = Object.keys(itemsByFullAuthor).slice(0, 5);
    fileLog('  Sample keys: ' + JSON.stringify(sampleKeys));

    // Find the matching key with exact lastName match (case-insensitive)
    for (const [authorKey, authorItems] of Object.entries(itemsByFullAuthor)) {
      const keyParts = authorKey.split('|');
      if (keyParts.length >= 2) {
        const storedFirst = keyParts[0].trim().toLowerCase();
        const storedLastRaw = keyParts[keyParts.length - 1].trim();
        // Case-insensitive comparison for last name
        const storedLastLower = storedLastRaw.toLowerCase();
        const searchLastLower = variantLastName.toLowerCase();

        if (storedFirst === normalizedFirst && storedLastLower === searchLastLower) {
          fileLog('  MATCH FOUND: authorKey="' + authorKey + '" items=' + (Array.isArray(authorItems) ? authorItems.length : 0));
          if (Array.isArray(authorItems)) {
            // Sort items by author name for consistent display
            return authorItems.slice().sort((a, b) => {
              const authorA = (a.author || '').toLowerCase();
              const authorB = (b.author || '').toLowerCase();
              return authorA.localeCompare(authorB);
            });
          }
          break;
        }
      }
    }

    fileLog('  NO MATCH FOUND for firstName="' + firstName + '" lastName="' + lastName + '"');
    return [];
  }

  extractYear(dateValue) {
    if (!dateValue || typeof dateValue !== 'string') {
      return '';
    }

    const match = dateValue.match(/(\d{4})/);
    return match ? match[1] : '';
  }

  /**
   * Analyze a list of creators for name variants
   * @param {Array} creators - Array of creator objects with occurrence counts
   * @returns {Object} Analysis results
   */
  async analyzeCreators(creators, progressCallback = null, shouldCancel = null) {
    Zotero.debug('ZoteroDBAnalyzer: analyzeCreators started with ' + (creators ? creators.length : 0) + ' creators');

    // Track occurrences per unique author (firstName + lastName)
    // This prevents different authors with the same surname from being aggregated together
    const authorOccurrences = {}; // Key: "normalizedFirst|normalizedLast", Value: { count, lastName, firstName, surnameVariants }
    const itemsByFullAuthor = {}; // Key: "firstName|rawLastName", Value: items array

    // Process each creator
    for (const creator of creators) {
      const fullName = `${creator.firstName} ${creator.lastName}`.trim();
      const parsed = this.parseName(fullName);
      const rawLastName = (creator.lastName || '').trim();

      if (parsed.lastName || rawLastName) {
        const firstName = (creator.firstName || '').trim();
        const normalizedFirst = this.normalizeFirstNameForGrouping(firstName);
        // Use parsed.lastName for grouping (to detect diacritic variants within same author)
        const normalizedLast = (parsed.lastName || rawLastName).toLowerCase().trim();

        // Key for tracking this specific author
        const authorKey = `${normalizedFirst}|${normalizedLast}`;

        if (!authorOccurrences[authorKey]) {
          authorOccurrences[authorKey] = {
            count: 0,
            firstName: firstName,
            lastName: parsed.lastName || rawLastName, // Keep parsed last name if available, else raw
            originalLastName: rawLastName, // Keep the raw lastName from the creator (before parsing)
            normalizedFirst,
            normalizedLast,
            surnameVariants: {} // Track all surname variations for this author: {lastName: {count, firstName, items}}
          };
        }
        authorOccurrences[authorKey].count += (creator.count || 1);

        // Track the creator's surname variant (preserve original casing for diacritic detection)
        // Use the original raw lastName so "and Friston" and "Friston" are tracked separately
        // Store the firstName and items directly so we don't need to look them up later
        if (!authorOccurrences[authorKey].surnameVariants[rawLastName]) {
          authorOccurrences[authorKey].surnameVariants[rawLastName] = {
            count: 0,
            firstName: firstName, // Store the raw firstName used with this surname variant
            items: [] // Store items directly with this variant
          };
        }
        authorOccurrences[authorKey].surnameVariants[rawLastName].count += (creator.count || 1);
        
        // Add items directly to this surname variant (limit to avoid memory issues)
        if (creator.items && creator.items.length > 0) {
          const existingItems = authorOccurrences[authorKey].surnameVariants[rawLastName].items;
          const limit = 25;
          for (const item of creator.items) {
            if (existingItems.length >= limit) break;
            // Avoid duplicates by checking item key or id
            const isDuplicate = existingItems.some(existing => {
              if (item.key && existing.key) return existing.key === item.key;
              if (item.id && existing.id) return existing.id === item.id;
              return false; // If no key or id, assume not duplicate
            });
            if (!isDuplicate) {
              existingItems.push(item);
            }
          }
        }

        // Also track surname variants from items (items might have different author names)
        if (creator.items && creator.items.length > 0) {
          for (const item of creator.items) {
            // Preserve original casing for diacritic detection
            const itemLastName = (item.authorLastName || rawLastName || '').trim();
            if (itemLastName && itemLastName !== rawLastName) {
              if (!authorOccurrences[authorKey].surnameVariants[itemLastName]) {
                authorOccurrences[authorKey].surnameVariants[itemLastName] = {
                  count: 0,
                  firstName: firstName,
                  items: []
                };
              }
              authorOccurrences[authorKey].surnameVariants[itemLastName].count += 1;
              // Add item to this variant too
              const variantItems = authorOccurrences[authorKey].surnameVariants[itemLastName].items;
              const isDuplicateVar = variantItems.some(existing => {
                if (item.key && existing.key) return existing.key === item.key;
                if (item.id && existing.id) return existing.id === item.id;
                return false;
              });
              if (variantItems.length < 25 && !isDuplicateVar) {
                variantItems.push(item);
              }
            }
          }
        }

        // Store items keyed by full author name (firstName|rawLastName) - keep for backward compatibility
        // Use the raw lastName so each surname variant has its own items
        const fullAuthorKey = `${creator.firstName || ''}|${creator.lastName || ''}`;
        if (creator.items && creator.items.length > 0) {
          itemsByFullAuthor[fullAuthorKey] = creator.items;
        }
      }
    }

    // Build surname frequencies from author occurrences (one entry per unique author)
    // Use lowercase keys for consistency
    const surnameFrequencies = {};
    for (const [authorKey, data] of Object.entries(authorOccurrences)) {
      const lastNameKey = (data.lastName || data.originalLastName || '').toLowerCase().trim();
      surnameFrequencies[lastNameKey] = (surnameFrequencies[lastNameKey] || 0) + data.count;
    }

    const surnames = Object.keys(surnameFrequencies);
    Zotero.debug('ZoteroDBAnalyzer: Found ' + surnames.length + ' unique surnames');
    console.log(`Analyzing ${surnames.length} unique surnames for variants...`);

    // DEBUG: Log progress via callback
    if (progressCallback) {
      progressCallback({
        stage: 'debug',
        message: 'Found ' + surnames.length + ' unique surnames',
        percent: 30
      });
    }

    // Find diacritic variants within each author's surname variations
    const potentialVariants = this.findDiacriticVariantsByAuthor(authorOccurrences, progressCallback, shouldCancel);

    // DEBUG
    if (progressCallback) {
      progressCallback({
        stage: 'debug',
        message: 'Found ' + potentialVariants.length + ' potential variants',
        percent: 50
      });
    }

    // Sort variants by combined frequency (prioritize more common surnames)
    potentialVariants.sort((a, b) => {
      const totalFreqA = a.variant1.frequency + a.variant2.frequency;
      const totalFreqB = b.variant1.frequency + b.variant2.frequency;
      return totalFreqB - totalFreqA;
    });

    const creatorsBySurname = this.groupCreatorsBySurnameForVariants(creators);
    const givenNameVariantGroups = this.findGivenNameVariantGroups(creatorsBySurname);

    // DEBUG
    if (progressCallback) {
      progressCallback({
        stage: 'debug',
        message: 'Given name variant groups: ' + givenNameVariantGroups.length,
        percent: 70
      });
    }

    // Report progress: generating suggestions
    if (progressCallback) {
      progressCallback({
        stage: 'generating_suggestions',
        processed: null,
        total: null,
        percent: 90
      });
    }

    // Generate normalization suggestions with items tracked by full author
    const suggestions = this.generateNormalizationSuggestions(
      potentialVariants,
      givenNameVariantGroups,
      itemsByFullAuthor
    );

    // DEBUG
    if (progressCallback) {
      progressCallback({
        stage: 'debug',
        message: 'Generated ' + suggestions.length + ' suggestions',
        percent: 95
      });
    }

    return {
      surnameFrequencies,
      potentialVariants,
      suggestions,
      totalUniqueSurnames: surnames.length,
      totalVariantGroups: suggestions.length,
      givenNameVariantGroups
    };
  }

  findVariantsEfficiently(surnameFrequencies, progressCallback = null, shouldCancel = null) {
    const surnames = Object.keys(surnameFrequencies);
    const potentialVariants = [];

    // O(n) approach using a Map: group by normalized (diacritic-agnostic) form
    // Surnames that normalize to the same string are diacritic variants
    const { normalizeName } = require('../utils/string-distance.js');

    // Group surnames by their normalized form
    const normalizedGroups = new Map(); // normalizedKey -> [{name, frequency, items}]

    for (let i = 0; i < surnames.length; i++) {
      // Check for cancellation
      if (shouldCancel && shouldCancel()) {
        throw new Error('Analysis cancelled');
      }

      const name = surnames[i];
      const normalizedKey = normalizeName(name);

      if (!normalizedGroups.has(normalizedKey)) {
        normalizedGroups.set(normalizedKey, []);
      }
      normalizedGroups.get(normalizedKey).push({
        name,
        frequency: surnameFrequencies[name]
      });

      // Progress reporting
      if (progressCallback && i % 10 === 0) {
        progressCallback({
          stage: 'analyzing_surnames',
          processed: i,
          total: surnames.length,
          percent: Math.round((i / surnames.length) * 80) // Max 80% here, save 20% for suggestions
        });
      }
    }

    // Convert groups to variants
    for (const [normalizedKey, variants] of normalizedGroups) {
      if (variants.length > 1) {
        // Found diacritic variants! Sort by frequency (most frequent = recommended)
        variants.sort((a, b) => b.frequency - a.frequency);
        const recommended = variants[0].name;

        // Create pairs (each variant with the recommended form)
        for (let i = 1; i < variants.length; i++) {
          potentialVariants.push({
            variant1: {
              name: recommended,
              frequency: variants[0].frequency
            },
            variant2: {
              name: variants[i].name,
              frequency: variants[i].frequency
            },
            similarity: 1.0,
            recommendedNormalization: recommended
          });
        }
      }
    }

    Zotero.debug('ZoteroDBAnalyzer: Variant detection complete, found ' + potentialVariants.length + ' variant groups');
    console.log(`Found ${potentialVariants.length} diacritic variant pairs`);
    return potentialVariants;
  }

  /**
   * Find diacritic variants within the same author's surname variations
   * This ensures only the SAME author (same first name) can have surname variants detected
   * @param {Object} authorOccurrences - Object keyed by "normalizedFirst|normalizedLast" with author data including surnameVariants
   * @param {Function} progressCallback - Optional progress callback
   * @param {Function} shouldCancel - Optional cancellation check
   * @returns {Array} Array of variant pairs
   */
  findDiacriticVariantsByAuthor(authorOccurrences, progressCallback = null, shouldCancel = null) {
    const { normalizeName, isDiacriticOnlyVariant } = require('../utils/string-distance.js');
    const potentialVariants = [];

    Zotero.debug('ZoteroDBAnalyzer: findDiacriticVariantsByAuthor called with ' + Object.keys(authorOccurrences).length + ' authors');

    const authorKeys = Object.keys(authorOccurrences);
    const totalAuthors = authorKeys.length;
    const threshold = Math.max(50, Math.ceil(totalAuthors * 0.05));

    // For each author, check if they have diacritic variants in their surname variations
    for (let i = 0; i < authorKeys.length; i++) {
      const authorKey = authorKeys[i];
      const data = authorOccurrences[authorKey];

      // Progress reporting
      if (progressCallback && (i === 0 || i === totalAuthors - 1 || i % threshold === 0)) {
        progressCallback({
          stage: 'analyzing_surnames',
          processed: i + 1,
          total: totalAuthors,
          percent: Math.round(((i + 1) / totalAuthors) * 80)
        });
      }
      // Check for cancellation
      if (shouldCancel && shouldCancel()) {
        throw new Error('Analysis cancelled');
      }

      const surnameVariants = data.surnameVariants || {};
      const variantNames = Object.keys(surnameVariants);

      Zotero.debug('ZoteroDBAnalyzer: Checking author ' + authorKey + ' with variants: ' + JSON.stringify(surnameVariants));

      // Need at least 2 different surname spellings for diacritic detection
      if (variantNames.length < 2) {
        Zotero.debug('ZoteroDBAnalyzer: Skipping - only ' + variantNames.length + ' variant(s)');
        continue;
      }

      // Group surname variants by their normalized (diacritic-agnostic) form
      const normalizedVariantGroups = new Map(); // normalizedKey -> [{name, count, firstName, items}]

      for (const [name, variantData] of Object.entries(surnameVariants)) {
        // variantData is now {count, firstName, items} instead of just count
        const count = typeof variantData === 'object' ? variantData.count : variantData;
        const variantFirstName = typeof variantData === 'object' ? variantData.firstName : data.firstName;
        const variantItems = typeof variantData === 'object' ? (variantData.items || []) : [];
        const normalizedKey = normalizeName(name);
        Zotero.debug('ZoteroDBAnalyzer: Normalized "' + name + '" -> "' + normalizedKey + '" (items: ' + variantItems.length + ')');

        if (!normalizedVariantGroups.has(normalizedKey)) {
          normalizedVariantGroups.set(normalizedKey, []);
        }
        normalizedVariantGroups.get(normalizedKey).push({ name, count, firstName: variantFirstName, items: variantItems });
      }

      // If we have multiple variants that normalize to the same key, these are diacritic variants
      if (normalizedVariantGroups.size >= 1) {
        // Collect all variants and their counts, firstName, and items
        const allVariants = [];
        for (const [normalizedKey, variants] of normalizedVariantGroups) {
          for (const v of variants) {
            allVariants.push({ 
              name: v.name, 
              count: v.count, 
              normalizedKey,
              firstName: v.firstName,
              items: v.items || []
            });
          }
        }

        // If we have only one variant form (all normalize to same), no diacritic issue
        if (allVariants.length < 2) {
          continue;
        }

        // Sort by frequency to determine recommended form
        allVariants.sort((a, b) => b.count - a.count);
        const recommended = allVariants[0].name;
        const recommendedFirstName = allVariants[0].firstName || data.firstName || '';
        const recommendedItems = allVariants[0].items || [];

        // Calculate total count for the recommended form (sum of all variants that normalize to it)
        const recommendedNormalized = normalizeName(recommended);
        const recommendedGroup = normalizedVariantGroups.get(recommendedNormalized);
        const recommendedCount = recommendedGroup.reduce((sum, v) => sum + v.count, 0);

        // Get author info for filtering items - use the lastName from data but firstName from the variant
        const authorLastName = data.originalLastName || data.lastName || '';

        // Create pairs between the recommended form and other variants (skip the first one which is recommended)
        for (let i = 1; i < allVariants.length; i++) {
          const v = allVariants[i];
          potentialVariants.push({
            variant1: {
              name: recommended,
              frequency: recommendedCount,
              firstName: recommendedFirstName,
              items: recommendedItems // Items stored directly, no lookup needed
            },
            variant2: {
              name: v.name,
              frequency: v.count,
              firstName: v.firstName || data.firstName || '',
              items: v.items || [] // Items stored directly, no lookup needed
            },
            similarity: 1.0,
            recommendedNormalization: recommended,
            // Include author info for display purposes
            authorInfo: {
              firstName: recommendedFirstName,
              lastName: authorLastName
            }
          });
        }
      }
    }

    Zotero.debug('ZoteroDBAnalyzer: Author diacritic variant detection complete, found ' + potentialVariants.length + ' variant groups');

    // Final progress update - ensure we signal completion of this phase
    if (progressCallback && totalAuthors > 0) {
      progressCallback({
        stage: 'analyzing_surnames',
        processed: totalAuthors,
        total: totalAuthors,
        percent: 80
      });
    }

    return potentialVariants;
  }

  /**
   * Group creators by normalized first name + surname
   * This ensures only the SAME author (same first name variant) is grouped together
   * Different authors with the same surname (e.g., "Alex Martin" vs "Andrea Martin") are NOT grouped
   * Initial-only names are grouped with full names that match their first letter
   * @param {Array} creators - Array of creator objects
   * @returns {Object} Object with group keys and creator arrays as values
   */
  groupCreatorsBySurnameForVariants(creators) {
    const surnameGroups = {};
    const initialGroups = {}; // Track initial-only names separately

    // First pass: group full names by (normalized first name + surname)
    for (const creator of creators) {
      if (!creator || !creator.lastName) {
        continue;
      }

      const firstName = (creator.firstName || '').trim();
      const normalizedFirst = this.normalizeFirstNameForGrouping(firstName);
      const lastNameKey = (creator.lastName || '').toLowerCase().trim();

      if (normalizedFirst.startsWith('init:')) {
        // Initial-only: track separately by surname
        if (!initialGroups[lastNameKey]) {
          initialGroups[lastNameKey] = [];
        }
        initialGroups[lastNameKey].push({ creator, normalizedFirst });
      } else {
        // Full name: group by normalized first name + surname
        const groupKey = `${normalizedFirst}|${lastNameKey}`;
        if (!surnameGroups[groupKey]) {
          surnameGroups[groupKey] = [];
        }
        surnameGroups[groupKey].push(creator);
      }
    }

    // Second pass: assign initial-only names to matching full name groups
    for (const [surname, initials] of Object.entries(initialGroups)) {
      for (const { creator, normalizedFirst } of initials) {
        // Get the first letter of the initial
        const firstLetter = normalizedFirst.slice(5).charAt(0).toLowerCase();

        // Look for a full name group with the same first letter
        // Try to find a group where the normalized first name starts with this letter
        const matchingKey = Object.keys(surnameGroups).find(key => {
          const [normalizedFirst] = key.split('|');
          return normalizedFirst.startsWith(firstLetter) && key.endsWith(`|${surname}`);
        });

        if (matchingKey) {
          // Add to the matching full name group
          surnameGroups[matchingKey].push(creator);
        } else {
          // No matching full name found, create a separate group
          const groupKey = `${normalizedFirst}|${surname}`;
          if (!surnameGroups[groupKey]) {
            surnameGroups[groupKey] = [];
          }
          surnameGroups[groupKey].push(creator);
        }
      }
    }

    return surnameGroups;
  }

  /**
   * Normalize first name for grouping purposes
   * Handles initials and uses name variants from COMMON_GIVEN_NAME_EQUIVALENTS
   * @param {string} firstName - The first name to normalize
   * @returns {string} Normalized first name for grouping
   */
  normalizeFirstNameForGrouping(firstName) {
    if (!firstName || !firstName.trim()) {
      return 'unknown';  // Handle cases with no first name
    }

    const cleaned = firstName.toLowerCase().trim();

    // Check if it's an initial sequence (e.g., "J.", "J.A.", "A.B.C.")
    // First, extract the base word (first non-initial word)
    const tokens = cleaned.split(/[\s.-]+/).filter(Boolean);
    const baseWord = tokens[0] || '';

    // Check if this looks like an initial-only name:
    // - Single token that is short (1-3 letters)
    // - OR multiple tokens that are all single letters
    const withoutDots = cleaned.replace(/\./g, '');
    const allTokensAreInitials = tokens.length > 0 && tokens.every(t => t.length === 1);

    if (tokens.length === 1 && tokens[0].length <= 3) {
      // Single short token like "J", "J.", "A" - treat as initial
      return `init:${tokens[0]}`;
    } else if (allTokensAreInitials) {
      // Multiple single-letter tokens like "J A", "J.A.B." - treat as initial sequence
      return `init:${withoutDots}`;
    }

    // Not an initial sequence - normalize the base word
    // Use name variants to normalize
    // COMMON_GIVEN_NAME_EQUIVALENTS in this file is {Variant: Canonical}
    // Simple lookup to get the canonical form
    if (COMMON_GIVEN_NAME_EQUIVALENTS && COMMON_GIVEN_NAME_EQUIVALENTS[baseWord]) {
      return COMMON_GIVEN_NAME_EQUIVALENTS[baseWord];
    }

    // If no match in variants, use the base word as the normalized form
    // This ensures "Fred", "Fred.", "Fred R. E. D." all group under "fred"
    return baseWord || cleaned;
  }

  parseGivenNameTokens(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return [];
    }

    const tokens = trimmed.split(/[\s-]+/).filter(Boolean);
    const parsed = [];

    for (const token of tokens) {
      const cleaned = token.replace(/[^A-Za-z]/g, '');
      if (!cleaned) {
        continue;
      }

      if (this.isLikelyInitialSequence(cleaned, token)) {
        cleaned.toUpperCase().split('').forEach(letter => {
          parsed.push({ type: 'initial', value: letter });
        });
        continue;
      }

      if (cleaned.length === 1) {
        parsed.push({ type: 'initial', value: cleaned.toUpperCase() });
      } else {
        parsed.push({ type: 'word', value: this.toTitleCase(cleaned) });
      }
    }

    return parsed;
  }

  extractTokenSignature(tokens = []) {
    const initials = new Set();
    const extraWords = new Set();
    let baseConsumed = false;

    for (const token of tokens) {
      if (!token) {
        continue;
      }
      if (token.type === 'word') {
        if (!baseConsumed) {
          baseConsumed = true;
          continue;
        }
        extraWords.add(token.value.toLowerCase());
      } else if (token.type === 'initial') {
        initials.add(token.value.toUpperCase());
      }
    }

    return {
      initials: Array.from(initials),
      extraWords: Array.from(extraWords)
    };
  }

  mergeTokenSignatures(signatures = []) {
    const initials = new Set();
    const extraWords = new Set();

    for (const sig of signatures) {
      if (!sig) {
        continue;
      }
      (sig.initials || []).forEach(letter => initials.add(letter.toUpperCase()));
      (sig.extraWords || []).forEach(word => extraWords.add(word.toLowerCase()));
    }

    return {
      initials: Array.from(initials),
      extraWords: Array.from(extraWords)
    };
  }

  signaturesOverlap(signatureA, signatureB) {
    if (!signatureA || !signatureB) {
      return false;
    }

    const initialsA = new Set((signatureA.initials || []).map(letter => letter.toUpperCase()));
    for (const letter of signatureB.initials || []) {
      if (initialsA.has(letter.toUpperCase())) {
        return true;
      }
    }

    const wordsA = new Set((signatureA.extraWords || []).map(word => word.toLowerCase()));
    for (const word of signatureB.extraWords || []) {
      if (wordsA.has(word.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  clusterVariantsBySignature(variants = []) {
    if (!variants || variants.length <= 1) {
      return [variants.map((_, index) => index)];
    }

    const hasConnectors = (index) => {
      const signature = variants[index]?.tokenSignature;
      return !!(signature && ((signature.initials && signature.initials.length) || (signature.extraWords && signature.extraWords.length)));
    };

    const parent = variants.map((_, index) => index);
    const find = (index) => {
      if (parent[index] !== index) {
        parent[index] = find(parent[index]);
      }
      return parent[index];
    };
    const union = (a, b) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) {
        parent[rootB] = rootA;
      }
    };

    for (let i = 0; i < variants.length; i++) {
      if (!hasConnectors(i)) {
        continue;
      }
      for (let j = i + 1; j < variants.length; j++) {
        if (!hasConnectors(j)) {
          continue;
        }
        if (this.signaturesOverlap(variants[i].tokenSignature, variants[j].tokenSignature)) {
          union(i, j);
        }
      }
    }

    const clustersMap = new Map();
    const connectorless = [];

    for (let index = 0; index < variants.length; index++) {
      if (!hasConnectors(index)) {
        connectorless.push(index);
        continue;
      }
      const root = find(index);
      if (!clustersMap.has(root)) {
        clustersMap.set(root, []);
      }
      clustersMap.get(root).push(index);
    }

    const clusters = Array.from(clustersMap.values());

    if (clusters.length === 0) {
      // No connectors at all, keep everything together
      return [variants.map((_, index) => index)];
    }

    if (connectorless.length > 0) {
      const clusterFrequencies = clusters.map(indexes =>
        indexes.reduce((sum, idx) => sum + (variants[idx].frequency || 0), 0)
      );
      let maxIndex = 0;
      let maxValue = clusterFrequencies[0] || 0;
      for (let i = 1; i < clusterFrequencies.length; i++) {
        if (clusterFrequencies[i] > maxValue) {
          maxValue = clusterFrequencies[i];
          maxIndex = i;
        }
      }
      connectorless.forEach(idx => clusters[maxIndex].push(idx));
    }

    return clusters;
  }

  isLikelyInitialSequence(cleanedValue, originalToken = '') {
    if (!cleanedValue) {
      return false;
    }

    const upper = cleanedValue.toUpperCase();
    if (upper.length < 2 || upper.length > 4) {
      return false;
    }

    if (/[^A-Z]/.test(upper)) {
      return false;
    }

    if (/\./.test(originalToken)) {
      return true;
    }

    const vowelPattern = /[AEIOUY]/;
    if (!vowelPattern.test(upper)) {
      return true;
    }

    return false;
  }

  selectCanonicalGivenNameData(bucket, normalizedKey) {
    const fallbackBase = normalizedKey && !normalizedKey.startsWith('initial:')
      ? this.toTitleCase(normalizedKey)
      : '';

    let bestTokens = [];
    let bestWeight = -Infinity;

    for (const creator of bucket || []) {
      const rawFirst = (creator.parsedName?.firstName || creator.firstName || '').trim();
      if (!rawFirst) {
        continue;
      }

      const tokens = this.parseGivenNameTokens(rawFirst);
      if (tokens.length === 0) {
        continue;
      }

      const hasWord = tokens.some(token => token.type === 'word');
      let weight = (creator.count || 1) + tokens.length;
      if (hasWord) {
        weight += 1000;
      }

      if (weight > bestWeight) {
        bestTokens = tokens;
        bestWeight = weight;
      }
    }

    const baseWordToken = bestTokens.find(token => token.type === 'word');
    const baseWord = baseWordToken ? baseWordToken.value : fallbackBase;

    const extraWords = [];
    const initials = [];
    let encounteredBase = false;

    for (const token of bestTokens) {
      if (token.type === 'word') {
        if (!encounteredBase && (!baseWordToken || token.value === baseWordToken.value)) {
          encounteredBase = true;
          continue;
        }
        if (!extraWords.includes(token.value)) {
          extraWords.push(token.value);
        }
      } else if (token.type === 'initial') {
        const upper = token.value.toUpperCase();
        if (!initials.includes(upper)) {
          initials.push(upper);
        }
      }
    }

    return {
      baseWord,
      extraWords,
      initials
    };
  }

  composeGivenNameFromTokens(tokens, canonicalData = {}) {
    const baseWordDefault = canonicalData.baseWord || '';
    const canonicalExtraWords = canonicalData.extraWords || [];
    const canonicalInitials = canonicalData.initials || [];

    const safeTokens = Array.isArray(tokens) ? tokens : [];
    const wordTokens = safeTokens.filter(token => token && token.type === 'word');
    const initialTokens = safeTokens.filter(token => token && token.type === 'initial');
    const variantHasWord = wordTokens.length > 0;
    const variantHasInitial = initialTokens.length > 0;
    const variantIsInitialOnly = !variantHasWord && variantHasInitial;

    let basePart = '';
    const additionalWords = [];
    const orderedInitials = [];

    for (const token of safeTokens) {
      if (token.type === 'word') {
        if (!basePart) {
          basePart = token.value;
        } else if (!additionalWords.includes(token.value)) {
          additionalWords.push(token.value);
        }
      } else if (token.type === 'initial') {
        const upper = token.value.toUpperCase();
        if (!orderedInitials.includes(upper)) {
          orderedInitials.push(upper);
        }
      }
    }

    if (!basePart && baseWordDefault) {
      basePart = baseWordDefault;
    }

    const baseInitial = basePart ? basePart.charAt(0).toUpperCase() : '';

    if (!basePart && orderedInitials.length > 0) {
      basePart = `${orderedInitials[0]}.`;
      orderedInitials.shift();
    }

    if (variantIsInitialOnly) {
      canonicalExtraWords.forEach(word => {
        if (!word) {
          return;
        }
        if (!additionalWords.includes(word) && word !== basePart) {
          additionalWords.push(word);
        }
      });
    }

    const combinedInitials = [];
    const seenInitials = new Set();

    const appendInitial = (letter) => {
      if (!letter) {
        return;
      }
      const upper = letter.toUpperCase();
      if (upper === baseInitial && !seenInitials.has(upper)) {
        seenInitials.add(upper);
        return;
      }
      if (!seenInitials.has(upper)) {
        combinedInitials.push(`${upper}.`);
        seenInitials.add(upper);
      }
    };

    orderedInitials.forEach(letter => appendInitial(letter));
    if (variantIsInitialOnly) {
      canonicalInitials.forEach(letter => appendInitial(letter));
    }

    const parts = [];
    if (basePart) {
      parts.push(basePart);
    }
    parts.push(...additionalWords);
    parts.push(...combinedInitials);

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  findGivenNameVariantGroups(creatorsBySurname) {
    const groups = [];

    for (const [groupKey, creators] of Object.entries(creatorsBySurname)) {
      // Skip groups with fewer than 2 creators UNLESS it's an initial-only group
      // Initial-only groups (with just initials) should be included for merging with full names
      if (!creators || creators.length < 1) {
        continue;
      }

      // Extract surname from the group key (format: "normalizedFirst|surname" or "init:|surname")
      const lastPipeIndex = groupKey.lastIndexOf('|');
      const surname = lastPipeIndex > 0 ? groupKey.slice(lastPipeIndex + 1) : groupKey;

      // For initial-only groups with just 1 creator, still process them
      // They might merge with full name groups later
      const results = this.findGivenNameVariantsForSurname(surname, creators);
      if (results.length > 0) {
        groups.push(...results);
      }
    }

    return groups;
  }

  findGivenNameVariantsForSurname(surname, creators) {
    const groups = [];
    const normalizedBuckets = new Map();
    const itemsByKey = new Map();
    const surnameKey = (surname || '').trim();
    const surnameLower = surnameKey.toLowerCase();
    const displaySurname = this.toTitleCase(surnameKey);

    for (const creator of creators) {
      const parsedFirstParts = [
        creator.parsedName?.firstName,
        creator.parsedName?.middleName
      ].filter(part => part && typeof part === 'string' && part.trim().length > 0);

      const parsedFirst = parsedFirstParts.join(' ').trim();
      const fallbackFirst = (creator.firstName || '').trim();
      const effectiveFirst = parsedFirst || fallbackFirst;

      if (!effectiveFirst) {
        continue;
      }

      const normalized = this.normalizeGivenName(effectiveFirst);
      const key = normalized || effectiveFirst.toLowerCase();

      if (!normalizedBuckets.has(key)) {
        normalizedBuckets.set(key, []);
      }

      normalizedBuckets.get(key).push(creator);

      const creatorKey = `${effectiveFirst}|${creator.lastName}`;
      if (!itemsByKey.has(creatorKey)) {
        itemsByKey.set(creatorKey, creator.items || []);
      }
    }

    this.mergeInitialBuckets(normalizedBuckets);

    for (const [normalizedKey, bucket] of normalizedBuckets.entries()) {
      if (bucket.length < 2) {
        continue;
      }

      const bucketCanonical = this.selectCanonicalGivenNameData(bucket, normalizedKey);
      const fullNames = new Map();

      for (const creator of bucket) {
        const rawFirstParts = [
          creator.parsedName?.firstName,
          creator.parsedName?.middleName
        ].filter(part => part && typeof part === 'string' && part.trim().length > 0);

        const rawFirst = (rawFirstParts.join(' ').trim()) || (creator.firstName || '').trim();
        const tokens = this.parseGivenNameTokens(rawFirst);
        const signature = this.extractTokenSignature(tokens);
        const displayFirst = this.composeGivenNameFromTokens(tokens, bucketCanonical)
          || bucketCanonical.baseWord
          || rawFirst;

        const rawLast = (creator.parsedName?.lastName || creator.lastName || surnameKey).trim();
        const displayLast = this.toTitleCase(rawLast);

        const variantKey = `${displayFirst}|${displayLast}`.toLowerCase();
        const existing = fullNames.get(variantKey) || {
          firstName: displayFirst,
          lastName: displayLast,
          frequency: 0,
          items: [],
          name: `${displayFirst} ${displayLast}`.trim(),
          tokenSignatures: [],
          creatorRefs: []
        };

        existing.frequency += creator.count || 1;
        existing.lastName = displayLast;
        existing.name = `${existing.firstName} ${displayLast}`.trim();
        existing.tokenSignatures.push(signature);
        existing.creatorRefs.push({ creator, tokens, signature });

        const nameKey = `${rawFirst}|${creator.lastName}`;
        if (itemsByKey.has(nameKey)) {
          existing.items = this.mergeItemSummaries(existing.items, itemsByKey.get(nameKey));
        }

        fullNames.set(variantKey, existing);
      }

      if (fullNames.size < 2) {
        continue;
      }

      const variantsArray = Array.from(fullNames.values()).map(variant => {
        const lastNameDisplay = this.toTitleCase(variant.lastName || displaySurname);
        const combinedSignature = this.mergeTokenSignatures(variant.tokenSignatures || []);
        return Object.assign({}, variant, {
          lastName: lastNameDisplay,
          name: `${variant.firstName} ${lastNameDisplay}`.trim(),
          tokenSignature: combinedSignature,
          creatorRefs: (variant.creatorRefs || []).slice()
        });
      });

      const clusters = this.clusterVariantsBySignature(variantsArray);

      for (const indexSet of clusters) {
        if (!indexSet || indexSet.length < 2) {
          continue;
        }

        const clusterVariants = indexSet.map(idx => Object.assign({}, variantsArray[idx]));
        const clusterCreators = [];

        clusterVariants.forEach(variant => {
          (variant.creatorRefs || []).forEach(ref => {
            if (ref && ref.creator) {
              clusterCreators.push(ref.creator);
            }
          });
        });

        if (clusterCreators.length === 0) {
          continue;
        }

        const clusterCanonical = this.selectCanonicalGivenNameData(clusterCreators, normalizedKey);
        const sanitizedVariants = clusterVariants.map(variant => {
          const clone = Object.assign({}, variant);
          delete clone.tokenSignature;
          delete clone.creatorRefs;
          return clone;
        });

        const recommendation = this.buildGivenNameRecommendation(sanitizedVariants, displaySurname, clusterCanonical);
        const clusterTotalFrequency = sanitizedVariants.reduce((sum, variant) => sum + (variant.frequency || 0), 0);

        groups.push({
          surname: displaySurname,
          surnameKey: surnameLower,
          normalizedKey,
          variants: sanitizedVariants,
          totalFrequency: clusterTotalFrequency,
          recommendedFirstName: recommendation.firstName,
          recommendedFullName: recommendation.fullName
        });
      }
    }

    return groups;
  }

  normalizeGivenName(firstName) {
    const trimmed = firstName.trim();
    if (!trimmed) {
      return '';
    }

    const tokens = trimmed.split(/[\s-]+/).filter(Boolean);
    const cleanedTokens = tokens.map(token => token.replace(/\./g, ''));

    if (cleanedTokens.length === 0) {
      return '';
    }

    const primaryToken = cleanedTokens[0].toLowerCase();

    if (cleanedTokens.every(token => token.length === 1)) {
      return `initial:${cleanedTokens.join('')}`;
    }

    if (cleanedTokens.length === 1 && this.isLikelyInitialSequence(cleanedTokens[0], tokens[0])) {
      return `initial:${cleanedTokens[0].toUpperCase()}`;
    }

    if (COMMON_GIVEN_NAME_EQUIVALENTS[primaryToken]) {
      return COMMON_GIVEN_NAME_EQUIVALENTS[primaryToken];
    }

    return primaryToken;
  }

  mergeItemSummaries(existing = [], incoming = []) {
    if (!incoming || incoming.length === 0) {
      return existing;
    }

    const byId = new Map();
    const max = 25;

    for (const summary of existing) {
      if (!summary) continue;
      const key = summary.key || summary.id || JSON.stringify(summary);
      if (!byId.has(key)) {
        byId.set(key, summary);
      }
      if (byId.size >= max) break;
    }

    for (const summary of incoming) {
      if (!summary) continue;
      const key = summary.key || summary.id || JSON.stringify(summary);
      if (!byId.has(key) && byId.size < max) {
        byId.set(key, summary);
      }
      if (byId.size >= max) break;
    }

    return Array.from(byId.values());
  }

  mergeInitialBuckets(normalizedBuckets) {
    const canonicalKeys = Array.from(normalizedBuckets.keys()).filter(key => !key.startsWith('initial:'));

    if (canonicalKeys.length === 0) {
      return normalizedBuckets;
    }

    for (const [key, bucket] of Array.from(normalizedBuckets.entries())) {
      if (!key.startsWith('initial:')) {
        continue;
      }

      const initials = key.replace('initial:', '');
      if (!initials) {
        continue;
      }

      const firstLetter = initials.charAt(0).toLowerCase();

      // Try to find a matching canonical key
      // Priority: exact initial sequence match > first letter match
      let destinationKey = null;

      // For multi-initial sequences, try exact prefix match first
      if (initials.length > 1) {
        destinationKey = canonicalKeys.find(
          canonicalKey => canonicalKey.startsWith(initials.toLowerCase())
        );
      }

      // If no exact match for multi-initial, or for single initial, match on first letter
      if (!destinationKey) {
        destinationKey = canonicalKeys.find(
          canonicalKey => canonicalKey.charAt(0).toLowerCase() === firstLetter
        );
      }

      if (destinationKey) {
        const destination = normalizedBuckets.get(destinationKey);
        bucket.forEach(entry => destination.push(entry));
        normalizedBuckets.delete(key);
      }
    }

    return normalizedBuckets;
  }

  buildGivenNameRecommendation(variants, surname, canonicalData = {}) {
    if (!variants || variants.length === 0) {
      return {
        firstName: '',
        fullName: surname || ''
      };
    }

    const pushUnique = (collection, value) => {
      if (!value) {
        return;
      }
      if (!collection.includes(value)) {
        collection.push(value);
      }
    };

    let baseWord = canonicalData.baseWord ? this.toTitleCase(canonicalData.baseWord) : '';
    const extraWords = [];
    const initials = [];
    let hasPlainWordVariant = false;

    for (const variant of variants) {
      const tokens = this.parseGivenNameTokens(variant.firstName || '');
      const variantHasWord = tokens.some(token => token.type === 'word');
      const variantHasInitial = tokens.some(token => token.type === 'initial');
      if (variantHasWord && !variantHasInitial) {
        hasPlainWordVariant = true;
      }
      let encounteredWord = false;

      for (const token of tokens) {
        if (token.type === 'word') {
          if (!encounteredWord) {
            encounteredWord = true;
            if (!baseWord) {
              baseWord = token.value;
            }
          } else {
            pushUnique(extraWords, token.value);
          }
        } else if (token.type === 'initial') {
          pushUnique(initials, token.value.toUpperCase());
        }
      }
    }

    (canonicalData.extraWords || []).forEach(word => pushUnique(extraWords, word));

    if (!hasPlainWordVariant) {
      (canonicalData.initials || []).forEach(letter => pushUnique(initials, letter.toUpperCase()));
    }

    if (!baseWord) {
      const fallbackTokens = this.parseGivenNameTokens(variants[0].firstName || '');
      const fallbackWord = fallbackTokens.find(token => token.type === 'word');
      if (fallbackWord) {
        baseWord = fallbackWord.value;
      } else {
        const fallbackInitial = fallbackTokens.find(token => token.type === 'initial');
        if (fallbackInitial) {
          const fallbackLetter = fallbackInitial.value.toUpperCase();
          baseWord = `${fallbackLetter}.`;
          const idx = initials.indexOf(fallbackLetter);
          if (idx !== -1) {
            initials.splice(idx, 1);
          }
        }
      }
    }

    const baseInitial = baseWord ? baseWord.charAt(0).toUpperCase() : '';
    if (baseInitial) {
      const index = initials.indexOf(baseInitial);
      if (index !== -1) {
        initials.splice(index, 1);
      }
    }

    if (hasPlainWordVariant) {
      initials.length = 0;
    }

    const recommendedParts = [];
    if (baseWord) {
      recommendedParts.push(baseWord);
    }
    recommendedParts.push(...extraWords);
    initials.forEach(letter => recommendedParts.push(`${letter}.`));

    const recommendedFirst = recommendedParts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const surnameDisplay = this.toTitleCase(surname || '');
    const recommendedFullName = surnameDisplay
      ? `${recommendedFirst} ${surnameDisplay}`.trim()
      : recommendedFirst;

    return {
      firstName: recommendedFirst,
      fullName: recommendedFullName
    };
  }

  scoreGivenNameVariant(variant) {
    if (!variant) {
      return 0;
    }

    let score = variant.frequency || 0;
    const name = (variant.firstName || '').trim();

    if (!name) {
      return score;
    }

    const cleaned = name.replace(/\./g, '');
    if (/[a-z]{2,}/i.test(cleaned)) {
      score += 1000;
    }

    if (!name.includes('.')) {
      score += 200;
    }

    const primaryToken = cleaned.split(/[\s-]+/)[0]?.toLowerCase() || '';
    if (COMMON_GIVEN_NAME_EQUIVALENTS[primaryToken]) {
      score += 50;
    }

    score += Math.min(cleaned.length, 20);
    return score;
  }

  toTitleCase(value) {
    if (!value) {
      return '';
    }

    // Title-case each word, and also uppercase letters after apostrophes or hyphens
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map(part => {
        const lowered = part.toLowerCase();
        // Capitalize first letter and letters after apostrophes or hyphens (supports accented letters)
        // Use Unicode property escapes to match letters
        return lowered.replace(/(^|['`-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
      })
      .join(' ');
  }

  /**
   * Parse a name string into components
   * @param {string} name - Full name string
   * @returns {Object} Parsed name components
   */
  parseName(name) {
    const NameParser = require('../core/name-parser.js');
    const parser = new NameParser();
    return parser.parse(name);
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    return normalizedLevenshtein(str1, str2);
  }

  /**
   * Generate normalization suggestions from variant pairs
   * @param {Array} variants - Array of variant pairs
   * @param {Array} givenNameVariantGroups - Given name variant groups
   * @param {Object} itemsByFullAuthor - Items keyed by "firstName|lastName"
   * @returns {Array} Array of normalization suggestions
   */
  generateNormalizationSuggestions(variants, givenNameVariantGroups = [], itemsByFullAuthor = {}) {
    const DEBUG = true;
    const log = (msg) => {
      if (DEBUG) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const line = timestamp + ' SUGGEST: ' + msg;
        console.error(line);
      }
    };

    log('generateNormalizationSuggestions called with ' + (variants ? variants.length : 0) + ' variants, ' + (givenNameVariantGroups ? givenNameVariantGroups.length : 0) + ' given-name groups');
    const suggestions = [];
    const processedSurnames = new Set();

    for (const variant of variants || []) {
      const norm1 = variant.variant1.name;
      const norm2 = variant.variant2.name;

      if (!processedSurnames.has(norm1) && !processedSurnames.has(norm2)) {
        // Use items directly from the variant (already collected during analysis)
        // Fall back to lookup only if items aren't already attached
        let items1 = variant.variant1.items || [];
        let items2 = variant.variant2.items || [];
        
        // Fallback: lookup if no items attached (backward compatibility)
        if (items1.length === 0) {
          const firstName1 = variant.variant1.firstName || (variant.authorInfo && variant.authorInfo.firstName) || '';
          items1 = firstName1
            ? this.findItemsByFullAuthorName(itemsByFullAuthor, firstName1, variant.variant1.name)
            : this.findItemsBySurname(itemsByFullAuthor, variant.variant1.name);
        }
        if (items2.length === 0) {
          const firstName2 = variant.variant2.firstName || (variant.authorInfo && variant.authorInfo.firstName) || '';
          items2 = firstName2
            ? this.findItemsByFullAuthorName(itemsByFullAuthor, firstName2, variant.variant2.name)
            : this.findItemsBySurname(itemsByFullAuthor, variant.variant2.name);
        }

        const suggestion = {
          type: 'surname',
          primary: variant.recommendedNormalization,
          // Include authorInfo for display purposes
          authorInfo: variant.authorInfo || null,
          variants: [
            {
              name: variant.variant1.name,
              frequency: variant.variant1.frequency,
              items: items1
            },
            {
              name: variant.variant2.name,
              frequency: variant.variant2.frequency,
              items: items2
            }
          ],
          similarity: variant.similarity,
          surnameKey: (variant.recommendedNormalization || '').toLowerCase()
        };

        this.enrichSuggestionWithGivenNameData(suggestion, givenNameVariantGroups);

        const shouldSkip = this.shouldSkipSuggestionFromLearning(suggestion);
        log('Checking suggestion: ' + norm1 + ' vs ' + norm2 + ' -> shouldSkip=' + shouldSkip);

        if (shouldSkip) {
          processedSurnames.add(norm1);
          processedSurnames.add(norm2);
          continue;
        }

        suggestions.push(suggestion);

        processedSurnames.add(norm1);
        processedSurnames.add(norm2);
      }
    }

    log('generateNormalizationSuggestions complete: suggestions=' + suggestions.length + ' of ' + (variants ? variants.length : 0) + ' variants');

    for (const group of givenNameVariantGroups || []) {
      if (!group || !group.surname || !Array.isArray(group.variants) || group.variants.length < 2) {
        continue;
      }

      const groupSurnameKey = group.surnameKey || group.surname.toLowerCase();
      const existing = suggestions.find(
        s => s.type === 'given-name'
          && (s.surnameKey || (s.surname || '').toLowerCase()) === groupSurnameKey
          && s.normalizedGivenNameKey === group.normalizedKey
      );
      const variantDatasets = group.variants.map(variant => {
        // Preserve original casing of the surname - don't title-case it
        const lastNameDisplay = variant.lastName || group.surname;
        return {
          name: `${variant.firstName} ${lastNameDisplay}`.trim(),
          firstName: variant.firstName,
          lastName: lastNameDisplay,
          frequency: variant.frequency,
          items: variant.items || []
        };
      });

      if (existing) {
        existing.variants = this.mergeVariantLists(existing.variants, variantDatasets);
        existing.totalFrequency = (existing.totalFrequency || 0) + (group.totalFrequency || 0);
        existing.surname = group.surname;
        existing.surnameKey = groupSurnameKey;
        existing.normalizedGivenNameKey = group.normalizedKey;
        if (!existing.recommendedFullName && group.recommendedFullName) {
          existing.recommendedFullName = group.recommendedFullName;
        }
      } else {
        const candidate = {
          type: 'given-name',
          surname: group.surname,
          surnameKey: groupSurnameKey,
          normalizedGivenNameKey: group.normalizedKey,
          variants: variantDatasets,
          totalFrequency: group.totalFrequency,
          recommendedFirstName: group.recommendedFirstName,
          recommendedFullName: group.recommendedFullName,
          primary: group.recommendedFullName || `${variantDatasets[0]?.name || ''}`
        };

        if (this.shouldSkipSuggestionFromLearning(candidate)) {
          continue;
        }

        suggestions.push(candidate);
      }
    }

    Zotero.debug('ZoteroDBAnalyzer: Generated ' + suggestions.length + ' normalization suggestions (combined)');
    return suggestions;
  }

  enrichSuggestionWithGivenNameData(suggestion, givenNameVariantGroups) {
    if (!suggestion || !givenNameVariantGroups || givenNameVariantGroups.length === 0) {
      return suggestion;
    }

    const surnameKey = (suggestion.surnameKey || suggestion.primary || '').toLowerCase();
    if (!surnameKey) {
      return suggestion;
    }

    const givenNameGroup = givenNameVariantGroups.find(
      group => group && (group.surnameKey || (group.surname || '').toLowerCase()) === surnameKey
    );
    if (!givenNameGroup) {
      return suggestion;
    }

    suggestion.relatedGivenNameVariants = givenNameGroup.variants.map(variant => ({
      firstName: variant.firstName,
      frequency: variant.frequency,
      items: variant.items || []
    }));
    suggestion.relatedGivenNameKey = givenNameGroup.normalizedKey;
    suggestion.relatedGivenNameTotal = givenNameGroup.totalFrequency;

    return suggestion;
  }

  mergeVariantLists(existing = [], incoming = []) {
    if (!incoming || incoming.length === 0) {
      return existing || [];
    }

    const byName = new Map();

    for (const variant of existing || []) {
      if (!variant) continue;
      const key = variant.name ? variant.name.toLowerCase() : JSON.stringify(variant);
      if (!byName.has(key)) {
        byName.set(key, { ...variant, items: variant.items ? [...variant.items] : [] });
      }
    }

    for (const variant of incoming) {
      if (!variant) continue;
      const key = variant.name ? variant.name.toLowerCase() : JSON.stringify(variant);
      if (!byName.has(key)) {
        byName.set(key, { ...variant, items: variant.items ? [...variant.items] : [] });
      } else {
        const current = byName.get(key);
        current.frequency = (current.frequency || 0) + (variant.frequency || 0);
        current.items = this.mergeItemSummaries(current.items, variant.items);
      }
    }

    return Array.from(byName.values()).sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
  }

  /**
   * Get normalization recommendations for a specific surname
   * @param {string} surname - Surname to check
   * @returns {Object|null} Normalization recommendation or null
   */
  async getNormalizationForSurname(surname) {
    if (typeof Zotero === 'undefined') {
      return null;
    }
    
    const results = await this.analyzeFullLibrary();
    
    // Find variants that include this surname
    for (const variant of results.potentialVariants) {
      if (variant.variant1.name === surname || variant.variant2.name === surname) {
        return {
          recommended: variant.recommendedNormalization,
          alternatives: [
            variant.variant1.name,
            variant.variant2.name
          ],
          similarity: variant.similarity,
          frequencies: {
            [variant.variant1.name]: variant.variant1.frequency,
            [variant.variant2.name]: variant.variant2.frequency
          }
        };
      }
    }
    
    return null;
  }

  /**
   * Apply learned normalizations from analysis to the database
   * @param {Array} suggestions - Array of normalization suggestions to apply
   * @param {boolean} autoConfirm - Whether to auto-confirm all suggestions
   * @returns {Object} Results of the normalization application
   */
  async applyNormalizationSuggestions(suggestions, autoConfirm = false, options = {}) {
    if (typeof Zotero === 'undefined') {
      throw new Error('This method must be run in the Zotero context');
    }

    // Ensure Zotero.Items is available
    if (typeof Zotero === 'undefined' || !Zotero.Items || typeof Zotero.Items.getAsync !== 'function') {
      throw new Error('Zotero Items API is not available');
    }

    const { progressCallback = null, declinedSuggestions = [] } = options || {};
    const incoming = Array.isArray(suggestions) ? suggestions : [];

    const results = {
      totalSuggestions: incoming.length,
      applied: 0,
      skipped: 0,
      errors: 0,
      updatedCreators: 0,
      declinedRecorded: 0
    };

    if (incoming.length === 0) {
      if (Array.isArray(declinedSuggestions) && declinedSuggestions.length > 0) {
        results.declinedRecorded += await this.recordDeclinedSuggestions(declinedSuggestions);
      }

      if (progressCallback) {
        progressCallback({
          stage: 'complete',
          applied: results.applied,
          skipped: results.skipped,
          updatedCreators: results.updatedCreators,
          declined: results.declinedRecorded,
          total: results.totalSuggestions
        });
      }

      return results;
    }

    try {
      const confirmed = [];

      for (const suggestion of incoming) {
        try {
          const shouldApply = autoConfirm || await this.confirmNormalization(suggestion);
          if (shouldApply) {
            confirmed.push(suggestion);
          } else {
            results.skipped++;
          }
        } catch (error) {
          console.error('Error applying normalization:', error);
          results.errors++;
        }
      }

      if (confirmed.length > 0) {
        if (progressCallback) {
          progressCallback({
            stage: 'prepare',
            total: confirmed.length
          });
        }

        const dbOutcome = await this.applyDatabaseNormalizations(confirmed, { progressCallback });

        results.applied = confirmed.length;
        results.updatedCreators = dbOutcome.updatedCreators || 0;
        results.errors += Array.isArray(dbOutcome.errors) ? dbOutcome.errors.length : 0;

        await this.persistLearningDecisions(confirmed, dbOutcome.plans);

        if (progressCallback) {
          progressCallback({
            stage: 'finalizing',
            total: confirmed.length,
            updatedCreators: results.updatedCreators
          });
        }
      }

      if (Array.isArray(declinedSuggestions) && declinedSuggestions.length > 0) {
        results.declinedRecorded += await this.recordDeclinedSuggestions(declinedSuggestions);
      }

      if (progressCallback) {
        progressCallback({
          stage: 'complete',
          applied: results.applied,
          skipped: results.skipped,
          updatedCreators: results.updatedCreators,
          declined: results.declinedRecorded,
          total: results.totalSuggestions
        });
      }
    } catch (error) {
      console.error('Error in applyNormalizationSuggestions:', error);
      results.errors++;

      if (progressCallback) {
        progressCallback({ stage: 'error', error });
      }
    }

    return results;
  }

  async persistLearningDecisions(suggestions, plans) {
    if (!this.learningEngine) {
      return;
    }

    const planMap = new Map();
    if (Array.isArray(plans)) {
      for (const plan of plans) {
        if (plan && plan.suggestion) {
          planMap.set(plan.suggestion, plan);
        }
      }
    }

    for (const suggestion of suggestions || []) {
      const plan = planMap.get(suggestion) || this.buildSuggestionOperationPlan(suggestion);
      await this.persistLearningForSuggestion(suggestion, plan);
    }
  }

  async persistLearningForSuggestion(suggestion, plan) {
    if (!this.learningEngine || !suggestion) {
      return;
    }

    const normalizedValue = (suggestion.primary || '').trim();
    const variants = Array.isArray(suggestion.variants) ? suggestion.variants : [];
    const variantPairs = plan && Array.isArray(plan.variantPairs)
      ? plan.variantPairs
      : this.getVariantPairsForSuggestion(suggestion);

    if (suggestion.type === 'surname') {
      for (const variant of variants) {
        const variantName = (variant && variant.name ? variant.name : '').trim();
        if (!variantName) {
          continue;
        }
        if (this.stringsEqualIgnoreCase(variantName, normalizedValue)) {
          continue;
        }
        try {
          await this.learningEngine.storeMapping(
            variantName,
            normalizedValue,
            suggestion.similarity || 1
          );
        } catch (error) {
          console.error('Error storing surname mapping:', error);
        }
      }
    } else {
      const normalizedFirstName = plan?.normalizedFirstName || '';
      const normalizedLastName = plan?.normalizedLastName || suggestion.surname || '';
      const normalizedFullName = plan?.normalizedFullName || this.buildFullName(normalizedFirstName, normalizedLastName);

      if (normalizedFullName) {
        for (const variant of variants) {
          const variantFirstName = this.extractVariantGivenName(variant);
          const variantLastName = this.extractVariantSurname(variant, normalizedLastName);
          const variantFullName = this.buildFullName(variantFirstName, variantLastName);
          if (!variantFullName) {
            continue;
          }
          if (this.stringsEqualIgnoreCase(variantFullName, normalizedFullName)) {
            continue;
          }
          try {
            await this.learningEngine.storeMapping(
              variantFullName,
              normalizedFullName,
              suggestion.similarity || 1
            );
          } catch (error) {
            console.error('Error storing given-name mapping:', error);
          }
        }
      }
    }

    if (variantPairs && variantPairs.length > 0 && typeof this.learningEngine.clearDistinctPair === 'function') {
      for (const pair of variantPairs) {
        try {
          await this.learningEngine.clearDistinctPair(pair.nameA, pair.nameB, pair.scope);
        } catch (error) {
          console.error('Error clearing distinct pair learning entry:', error);
        }
      }
    }
  }

  async recordDeclinedSuggestions(suggestions) {
    if (!this.learningEngine || typeof this.learningEngine.recordDistinctPair !== 'function') {
      return 0;
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return 0;
    }

    let recorded = 0;

    for (const suggestion of suggestions) {
      if (!suggestion) {
        continue;
      }
      const pairs = this.getVariantPairsForSuggestion(suggestion);
      for (const pair of pairs) {
        try {
          const saved = await this.learningEngine.recordDistinctPair(pair.nameA, pair.nameB, pair.scope);
          if (saved) {
            recorded++;
          }
        } catch (error) {
          console.error('Error recording distinct pair decision:', error);
        }
      }
    }

    return recorded;
  }

  async applyDatabaseNormalizations(suggestions, options = {}) {
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return { plans: [], operations: [], updatedCreators: 0, errors: [] };
    }

    const progressCallback = options.progressCallback || null;

    if (progressCallback) {
      progressCallback({
        stage: 'operations-planned',
        total: suggestions.length,
        suggestions: suggestions.length
      });
    }

    const errors = [];
    let updatedCreators = 0;
    let processed = 0;
    const totalSuggestions = suggestions.length;

    // Collect all item IDs that need updating
    const allItemIds = new Set();
    const itemUpdates = new Map(); // itemId -> { suggestion, variant, normalizedValue }

    for (const suggestion of suggestions) {
      if (!suggestion || !suggestion.primary) continue;

      const normalizedValue = suggestion.primary.trim();
      const type = suggestion.type || 'surname';

      for (const variant of (suggestion.variants || [])) {
        if (!variant || !variant.items || variant.items.length === 0) continue;

        for (const itemSummary of variant.items) {
          if (!itemSummary || !itemSummary.id) continue;
          const itemId = itemSummary.id;

          // Skip if this variant IS the normalized value (case-sensitive check)
          const variantName = (variant.name || '').trim();
          if (variantName === normalizedValue) continue;

          allItemIds.add(itemId);
          if (!itemUpdates.has(itemId)) {
            itemUpdates.set(itemId, { suggestion, variant, normalizedValue, type });
          }
        }
      }
    }

    if (allItemIds.size === 0) {
      if (progressCallback) {
        progressCallback({ stage: 'operations-finished', total: 0, updatedCreators: 0 });
      }
      return { plans: [], operations: [], updatedCreators: 0, errors: [] };
    }

    // Get all items that need updating
    const itemIdsArray = Array.from(allItemIds);
    const items = await Zotero.Items.getAsync(itemIdsArray);

    // Process each item
    for (const item of items) {
      if (!item || typeof item.getCreators !== 'function') continue;

      try {
        const creators = item.getCreators();
        if (!Array.isArray(creators)) continue;

        let updated = false;
        const normalizedCreators = creators.map(creator => {
          if (!creator) return creator;

          const updateInfo = itemUpdates.get(item.id);
          if (!updateInfo) return creator;

          const { normalizedValue, type, variant } = updateInfo;
          let newCreator = { ...creator };

          if (type === 'surname') {
            // Check if this creator's lastName matches the variant being normalized
            const creatorLastName = (creator.lastName || '').trim();
            const variantName = (variant.name || '').trim();

            if (this.stringsEqualIgnoreCase(creatorLastName, variantName)) {
              newCreator.lastName = normalizedValue;
              updated = true;
            }
          } else {
            // Full name normalization
            const creatorFirstName = (creator.firstName || '').trim();
            const creatorLastName = (creator.lastName || '').trim();
            const variantFirstName = (variant.firstName || '').trim();
            const variantLastName = (variant.lastName || creatorLastName).trim();

            if (this.stringsEqualIgnoreCase(creatorFirstName, variantFirstName) &&
                this.stringsEqualIgnoreCase(creatorLastName, variantLastName)) {
              // Parse the normalized value
              const normalizedParts = normalizedValue.split(' ');
              newCreator.firstName = normalizedParts[0] || '';
              newCreator.lastName = normalizedParts.slice(1).join(' ') || creatorLastName;
              updated = true;
            }
          }

          return newCreator;
        });

        if (updated) {
          item.setCreators(normalizedCreators);
          await item.save();
          updatedCreators++;

          if (progressCallback) {
            processed++;
            progressCallback({
              stage: 'operation-complete',
              processed,
              total: totalSuggestions,
              affected: 1,
              itemId: item.id
            });
          }
        }
      } catch (error) {
        errors.push({ itemId: item.id, error });
        console.error('Error updating item:', error);
      }
    }

    if (progressCallback) {
      progressCallback({
        stage: 'operations-finished',
        total: totalSuggestions,
        updatedCreators
      });
    }

    const plans = suggestions.map(suggestion => this.buildSuggestionOperationPlan(suggestion));
    return { plans, operations: [], updatedCreators, errors };
  }

  buildSuggestionOperationPlan(suggestion) {
    const normalizedValue = (suggestion && suggestion.primary ? suggestion.primary : '').trim();
    const plan = {
      suggestion,
      normalizedValue,
      operations: [],
      variantPairs: this.getVariantPairsForSuggestion(suggestion),
      normalizedFirstName: '',
      normalizedLastName: '',
      normalizedFullName: ''
    };

    if (!suggestion || !Array.isArray(suggestion.variants) || suggestion.variants.length === 0) {
      return plan;
    }

    const unique = new Set();

    if (suggestion.type === 'surname') {
      for (const variant of suggestion.variants) {
        const variantName = (variant && variant.name ? variant.name : '').trim();
        if (!variantName) {
          continue;
        }

        const opKey = `surname|${variantName.toLowerCase()}|${normalizedValue.toLowerCase()}`;
        if (unique.has(opKey)) {
          continue;
        }
        unique.add(opKey);

        if (variantName === normalizedValue) {
          continue;
        }

        plan.operations.push({
          type: 'surname',
          fromLastName: variantName,
          toLastName: normalizedValue,
          scope: 'surname',
          variant
        });
      }

      return plan;
    }

    const parsedNormalized = this.parseName(normalizedValue);
    const normalizedFirstName = [parsedNormalized.firstName, parsedNormalized.middleName]
      .filter(Boolean)
      .join(' ')
      .trim() || parsedNormalized.firstName || normalizedValue;
    const normalizedLastName = parsedNormalized.lastName || suggestion.surname || '';

    plan.normalizedFirstName = normalizedFirstName;
    plan.normalizedLastName = normalizedLastName;
    plan.normalizedFullName = this.buildFullName(normalizedFirstName, normalizedLastName);

    for (const variant of suggestion.variants) {
      const variantFirstName = this.extractVariantGivenName(variant);
      const variantLastName = this.extractVariantSurname(variant, normalizedLastName || suggestion.surname || '');
      if (!variantFirstName || !variantLastName) {
        continue;
      }

      const opKey = `given|${variantFirstName.toLowerCase()}|${variantLastName.toLowerCase()}`;
      if (unique.has(opKey)) {
        continue;
      }
      unique.add(opKey);

      if (this.stringsEqualIgnoreCase(variantFirstName, normalizedFirstName) &&
          this.stringsEqualIgnoreCase(variantLastName, normalizedLastName)) {
        continue;
      }

      plan.operations.push({
        type: 'given-name',
        fromFirstName: variantFirstName,
        fromLastName: variantLastName,
        toFirstName: normalizedFirstName,
        toLastName: normalizedLastName || variantLastName,
        scope: `given:${suggestion.surnameKey || (variantLastName || '').toLowerCase()}`,
        variant
      });
    }

    return plan;
  }

  getVariantPairsForSuggestion(suggestion) {
    if (!suggestion || !Array.isArray(suggestion.variants) || suggestion.variants.length < 2) {
      return [];
    }

    const variants = suggestion.variants;
    const scopeBase = suggestion.type === 'surname'
      ? 'surname'
      : `given:${suggestion.surnameKey || (suggestion.surname || '').toLowerCase()}`;
    const pairs = [];

    for (let i = 0; i < variants.length; i++) {
      const nameA = this.extractVariantPairName(suggestion, variants[i]);
      if (!nameA) {
        continue;
      }

      for (let j = i + 1; j < variants.length; j++) {
        const nameB = this.extractVariantPairName(suggestion, variants[j]);
        if (!nameB) {
          continue;
        }
        pairs.push({ nameA, nameB, scope: scopeBase });
      }
    }

    return pairs;
  }

  extractVariantPairName(suggestion, variant) {
    if (!variant) {
      return '';
    }

    if (suggestion && suggestion.type === 'surname') {
      return (variant.name || '').trim();
    }

    const surname = suggestion?.surname || variant.lastName || suggestion?.primary || '';
    const firstName = this.extractVariantGivenName(variant);
    if (firstName) {
      return this.buildFullName(firstName, surname);
    }

    return (variant.name || '').trim();
  }

  stringsEqualIgnoreCase(a, b) {
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  extractVariantGivenName(variant) {
    if (!variant) {
      return '';
    }

    if (typeof variant.firstName === 'string' && variant.firstName.trim()) {
      return variant.firstName.trim();
    }

    if (typeof variant.name === 'string' && variant.name.trim()) {
      const parsed = this.parseName(variant.name);
      const given = [parsed.firstName, parsed.middleName]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (given) {
        return given;
      }
    }

    return '';
  }

  extractVariantSurname(variant, fallback = '') {
    if (!variant) {
      return fallback || '';
    }

    if (typeof variant.lastName === 'string' && variant.lastName.trim()) {
      return variant.lastName.trim();
    }

    if (typeof variant.name === 'string' && variant.name.trim()) {
      const parsed = this.parseName(variant.name);
      if (parsed.lastName) {
        return parsed.lastName.trim();
      }
    }

    return fallback || '';
  }

  buildFullName(first, last) {
    return [first, last].filter(part => part && part.trim()).join(' ').trim();
  }

  describeOperation(operation) {
    if (!operation) {
      return '';
    }

    if (operation.type === 'surname') {
      return `${operation.fromLastName} → ${operation.toLastName}`;
    }

    const from = this.buildFullName(operation.fromFirstName, operation.fromLastName);
    const to = this.buildFullName(operation.toFirstName, operation.toLastName);
    return `${from} → ${to}`;
  }

  shouldSkipSuggestionFromLearning(suggestion) {
    if (!this.learningEngine || typeof this.learningEngine.isDistinctPair !== 'function') {
      return false;
    }

    const pairs = this.getVariantPairsForSuggestion(suggestion);
    if (!pairs || pairs.length === 0) {
      return false;
    }

    return pairs.some(pair => this.learningEngine.isDistinctPair(pair.nameA, pair.nameB, pair.scope));
  }

  /**
   * Confirm if a normalization should be applied (in a real UI this would show a dialog)
   * @param {Object} suggestion - Normalization suggestion
   * @returns {Promise<boolean>} Whether to apply the normalization
   */
  async confirmNormalization() {
    // In a real implementation, this would show a UI dialog
    // For now, we'll auto-confirm for testing purposes
    return true;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoteroDBAnalyzer;
}