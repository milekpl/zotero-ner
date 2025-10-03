/**
 * Zotero DB Analyzer - Handles database-specific queries for name analysis
 * This module uses Zotero's database APIs to efficiently extract and analyze names
 */

const COMMON_GIVEN_NAME_EQUIVALENTS = Object.freeze({
  frederic: 'frederick',
  frederick: 'frederick',
  fred: 'frederick',
  freddie: 'frederick',
  freddy: 'frederick',
  harry: 'harry',
  harold: 'harold',
  henry: 'henry',
  hal: 'harold',
  bob: 'robert',
  bobby: 'robert',
  rob: 'robert',
  robert: 'robert',
  robbie: 'robert',
  william: 'william',
  will: 'william',
  bill: 'william',
  billy: 'william',
  willie: 'william',
  elizabeth: 'elizabeth',
  liz: 'elizabeth',
  lizzie: 'elizabeth',
  beth: 'elizabeth',
  betty: 'elizabeth',
  jon: 'jonathan',
  jonathan: 'jonathan',
  john: 'john',
  jack: 'john',
  kate: 'katherine',
  katherine: 'katherine',
  catherine: 'catherine',
  cathy: 'catherine',
  kathy: 'catherine',
  alex: 'alexander',
  alexander: 'alexander',
  alexandra: 'alexandra',
  sandy: 'alexander',
  sasha: 'alexander',
  maggie: 'margaret',
  margaret: 'margaret',
  peggy: 'margaret',
  meg: 'margaret',
  megan: 'margaret',
  mike: 'michael',
  michael: 'michael',
  mick: 'michael',
  mickey: 'michael'
  ,
  // Added high-value nickname mappings
  paco: 'francisco',
  pepe: 'jose',
  che: 'ernesto',
  manu: 'manuel',
  toni: 'antonio'
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
    Zotero.debug('ZoteroDBAnalyzer: analyzeFullLibrary started');
    if (typeof Zotero === 'undefined') {
      Zotero.debug('ZoteroDBAnalyzer: Zotero undefined, throwing error');
      throw new Error('This method must be run in the Zotero context');
    }

    console.log('Starting full library analysis...');

    try {
      // Use Zotero.Search API to get all items with creators
      Zotero.debug('ZoteroDBAnalyzer: Creating search for libraryID: ' + Zotero.Libraries.userLibraryID);
      const search = new Zotero.Search();
      search.addCondition('libraryID', 'is', Zotero.Libraries.userLibraryID);

      const itemIDs = await search.search();
      Zotero.debug('ZoteroDBAnalyzer: Search returned ' + (itemIDs ? itemIDs.length : 0) + ' item IDs');
      console.log(`Found ${itemIDs.length} total items in library`);

      if (!itemIDs || itemIDs.length === 0) {
        console.log('No items found in library');
        return {
          surnameFrequencies: {},
          potentialVariants: [],
          suggestions: [],
          totalUniqueSurnames: 0,
          totalVariantGroups: 0
        };
      }

      // Filter to items that actually have creators
      const itemsWithCreators = [];
      const filterBatchSize = 200; // Larger batch for filtering

      Zotero.debug('ZoteroDBAnalyzer: Starting item filtering for creators, total items: ' + itemIDs.length);
      console.log(`Filtering ${itemIDs.length} items to find those with creators...`);

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

      // Process items in batches to avoid memory issues
      const processingBatchSize = 100;
      const creatorsMap = {};
      let processedItems = 0;

      for (let i = 0; i < itemIDs.length; i += processingBatchSize) {
        // Check for cancellation
        if (shouldCancel && shouldCancel()) {
          console.log('Analysis cancelled by user');
          throw new Error('Analysis cancelled');
        }

        const batch = itemIDs.slice(i, i + filterBatchSize);
        const items = await Zotero.Items.getAsync(batch);

        for (const item of items) {
          try {
            const creators = item.getCreators ? item.getCreators() : [];
            for (const creator of creators) {
              this.addCreatorOccurrence(creatorsMap, creator, item);
            }
          } catch (itemError) {
            console.warn('Error processing item creators:', itemError);
          }
        }

        processedItems += batch.length;

        // Report progress
        if (progressCallback) {
          progressCallback({
            stage: 'processing_items',
            processed: processedItems,
            total: itemIDs.length,
            percent: Math.round((processedItems / itemIDs.length) * 100)
          });
        }
      }

      Zotero.debug('ZoteroDBAnalyzer: Starting creator extraction from ' + itemsWithCreators.length + ' items');
      console.log(`Found ${itemsWithCreators.length} items with creators, now extracting creator data...`);

      // Now extract creators from the filtered items
      for (let i = 0; i < itemsWithCreators.length; i += processingBatchSize) {
        // Check for cancellation
        if (shouldCancel && shouldCancel()) {
          throw new Error('Analysis cancelled');
        }

        const batch = itemsWithCreators.slice(i, i + processingBatchSize);

        for (const item of batch) {
          try {
            const creators = item.getCreators ? item.getCreators() : [];
            for (const creator of creators) {
              this.addCreatorOccurrence(creatorsMap, creator, item);
            }
          } catch (itemError) {
            console.warn('Error processing item creators:', itemError);
          }
        }

        // Report progress
        if (progressCallback) {
          progressCallback({
            stage: 'extracting_creators',
            processed: i + batch.length,
            total: itemsWithCreators.length,
            percent: Math.round(((i + batch.length) / itemsWithCreators.length) * 100)
          });
        }
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
      // Analyze creators for surname frequencies and variants
      const results = await this.analyzeCreators(creators, progressCallback, shouldCancel);
      Zotero.debug('ZoteroDBAnalyzer: analyzeCreators completed, suggestions count: ' + (results.suggestions ? results.suggestions.length : 0));

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
      const summary = this.buildItemSummary(item);
      if (summary) {
        const limit = 25;
        if ((creatorsMap[key].items || []).length < limit) {
          creatorsMap[key].items.push(summary);
        }
      }
    }
  }

  buildItemSummary(item) {
    if (!item) {
      return null;
    }

    try {
      const getField = typeof item.getField === 'function' ? item.getField.bind(item) : null;
      const title = getField ? getField('title') : (item.title || '');
      const date = getField ? getField('date') : (item.date || '');
      const publicationYear = this.extractYear(date);
      const creatorsCount = typeof item.getCreators === 'function' ? (item.getCreators() || []).length : undefined;

      return {
        id: item.id || null,
        key: item.key || null,
        title: title || 'Untitled',
        date: date || '',
        year: publicationYear,
        itemType: item.itemType || (getField ? getField('itemType') : ''),
        creatorsCount
      };
    } catch (summaryError) {
      console.warn('Unable to summarize item for creator mapping:', summaryError);
      return null;
    }
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
    const surnameFrequencies = {};
    const surnameVariantItems = {};

    // Process each creator to extract surname frequencies
    for (const creator of creators) {
      const fullName = `${creator.firstName} ${creator.lastName}`.trim();
      const parsed = this.parseName(fullName);

      if (parsed.lastName) {
        const lastNameKey = parsed.lastName.toLowerCase().trim();
        surnameFrequencies[lastNameKey] = (surnameFrequencies[lastNameKey] || 0) + (creator.count || 1);
        surnameVariantItems[lastNameKey] = this.mergeItemSummaries(
          surnameVariantItems[lastNameKey],
          creator.items
        );
      }
    }

    const surnames = Object.keys(surnameFrequencies);
    Zotero.debug('ZoteroDBAnalyzer: Found ' + surnames.length + ' unique surnames');
    console.log(`Analyzing ${surnames.length} unique surnames for variants...`);

    // Use more efficient variant detection
    const potentialVariants = this.findVariantsEfficiently(surnameFrequencies, progressCallback, shouldCancel);

    // Sort variants by combined frequency (prioritize more common surnames)
    potentialVariants.sort((a, b) => {
      const totalFreqA = a.variant1.frequency + a.variant2.frequency;
      const totalFreqB = b.variant1.frequency + b.variant2.frequency;
      return totalFreqB - totalFreqA;
    });

    const creatorsBySurname = this.groupCreatorsBySurnameForVariants(creators);
    const givenNameVariantGroups = this.findGivenNameVariantGroups(creatorsBySurname);

    // Generate normalization suggestions
    const suggestions = this.generateNormalizationSuggestions(potentialVariants, givenNameVariantGroups, surnameVariantItems);

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

    // Use a more efficient approach: sort by frequency and compare similar-length names
    const sortedSurnames = surnames.sort((a, b) => surnameFrequencies[b] - surnameFrequencies[a]);

    const maxComparisons = Math.min(10000, sortedSurnames.length * 5); // Limit comparisons
    let comparisons = 0;

    for (let i = 0; i < sortedSurnames.length && comparisons < maxComparisons; i++) {
      // Check for cancellation
      if (shouldCancel && shouldCancel()) {
        throw new Error('Analysis cancelled');
      }

      const name1 = sortedSurnames[i];

      // Only compare with surnames of similar length (within 2 characters)
      const name1Length = name1.length;
      const minLength = Math.max(3, name1Length - 2);
      const maxLength = name1Length + 2;

      for (let j = i + 1; j < sortedSurnames.length && comparisons < maxComparisons; j++) {
        const name2 = sortedSurnames[j];

        // Skip if lengths are too different
        if (name2.length < minLength || name2.length > maxLength) {
          continue;
        }

        comparisons++;

        // Calculate similarity using Levenshtein distance
        const similarity = this.calculateStringSimilarity(name1, name2);

        if (similarity >= 0.8) { // 80% similarity threshold
          potentialVariants.push({
            variant1: {
              name: name1,
              frequency: surnameFrequencies[name1]
            },
            variant2: {
              name: name2,
              frequency: surnameFrequencies[name2]
            },
            similarity: similarity,
            recommendedNormalization: surnameFrequencies[name1] >= surnameFrequencies[name2]
              ? name1 : name2
          });
        }

        // Yield control periodically to prevent UI freezing
        if (comparisons % 100 === 0) {
          // Use synchronous timeout to yield control
          // Note: This is a simplified approach - in a real implementation,
          // you might want to use a different strategy for yielding control
        }
      }

      // Report progress
      if (progressCallback && i % 10 === 0) {
        progressCallback({
          stage: 'analyzing_surnames',
          processed: i,
          total: sortedSurnames.length,
          percent: Math.round((i / sortedSurnames.length) * 100)
        });
      }
    }

    Zotero.debug('ZoteroDBAnalyzer: Variant detection complete, compared ' + comparisons + ' pairs, found ' + potentialVariants.length + ' variants');
    console.log(`Compared ${comparisons} surname pairs, found ${potentialVariants.length} potential variants`);
    return potentialVariants;
  }

  groupCreatorsBySurnameForVariants(creators) {
    const surnameGroups = {};

    for (const creator of creators) {
      if (!creator || !creator.lastName) {
        continue;
      }

      const lastNameKey = (creator.lastName || '').toLowerCase().trim();
      if (!surnameGroups[lastNameKey]) {
        surnameGroups[lastNameKey] = [];
      }

      surnameGroups[lastNameKey].push(creator);
    }

    return surnameGroups;
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

    let basePart = '';
    const additionalWords = [];
    const orderedInitials = [];

    for (const token of tokens || []) {
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

    canonicalExtraWords.forEach(word => {
      if (!word) {
        return;
      }
      if (!additionalWords.includes(word) && word !== basePart) {
        additionalWords.push(word);
      }
    });

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
    canonicalInitials.forEach(letter => appendInitial(letter));

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

    for (const [surname, creators] of Object.entries(creatorsBySurname)) {
      if (!creators || creators.length < 2) {
        continue;
      }

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

    for (const creator of creators) {
      const parsedFirst = (creator.parsedName?.firstName || creator.firstName || '').trim();
      if (!parsedFirst) {
        continue;
      }

      const normalized = this.normalizeGivenName(parsedFirst);
      const key = normalized || parsedFirst.toLowerCase();

      if (!normalizedBuckets.has(key)) {
        normalizedBuckets.set(key, []);
      }

      normalizedBuckets.get(key).push(creator);

      const creatorKey = `${parsedFirst}|${creator.lastName}`;
      if (!itemsByKey.has(creatorKey)) {
        itemsByKey.set(creatorKey, creator.items || []);
      }
    }

    this.mergeInitialBuckets(normalizedBuckets);

    for (const [normalizedKey, bucket] of normalizedBuckets.entries()) {
      if (bucket.length < 2) {
        continue;
      }

      const canonicalData = this.selectCanonicalGivenNameData(bucket, normalizedKey);
      const fullNames = new Map();
      let totalCount = 0;

      for (const creator of bucket) {
        const rawFirst = (creator.parsedName?.firstName || creator.firstName || '').trim();
        const tokens = this.parseGivenNameTokens(rawFirst);
        const displayFirst = this.composeGivenNameFromTokens(tokens, canonicalData)
          || canonicalData.baseWord
          || rawFirst;

        const variantKey = `${displayFirst}|${creator.lastName}`.toLowerCase();
        const existing = fullNames.get(variantKey) || {
          firstName: displayFirst,
          lastName: creator.lastName,
          frequency: 0,
          items: []
        };

        existing.frequency += creator.count || 1;
        totalCount += creator.count || 1;

        const nameKey = `${rawFirst}|${creator.lastName}`;
        if (itemsByKey.has(nameKey)) {
          existing.items = this.mergeItemSummaries(existing.items, itemsByKey.get(nameKey));
        }

        fullNames.set(variantKey, existing);
      }

      if (fullNames.size < 2) {
        continue;
      }

      const variantsArray = Array.from(fullNames.values());
      const recommendation = this.buildGivenNameRecommendation(variantsArray, surname, canonicalData);

      groups.push({
        surname,
        normalizedKey,
        variants: variantsArray,
        totalFrequency: totalCount,
        recommendedFirstName: recommendation.firstName,
        recommendedFullName: recommendation.fullName
      });
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
      const destinationKey = canonicalKeys.find(
        canonicalKey => canonicalKey.charAt(0).toLowerCase() === firstLetter
      );

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

    for (const variant of variants) {
      const tokens = this.parseGivenNameTokens(variant.firstName || '');
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
    (canonicalData.initials || []).forEach(letter => pushUnique(initials, letter.toUpperCase()));

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

    const recommendedParts = [];
    if (baseWord) {
      recommendedParts.push(baseWord);
    }
    recommendedParts.push(...extraWords);
    initials.forEach(letter => recommendedParts.push(`${letter}.`));

    const recommendedFirst = recommendedParts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const recommendedFullName = surname ? `${recommendedFirst} ${surname}`.trim() : recommendedFirst;

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
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);
    const similarity = 1 - (distance / maxLength);
    
    return similarity;
  }

  /**
   * Generate normalization suggestions from variant pairs
   * @param {Array} variants - Array of variant pairs
   * @returns {Array} Array of normalization suggestions
   */
  generateNormalizationSuggestions(variants, givenNameVariantGroups = [], surnameVariantItems = {}) {
    Zotero.debug('ZoteroDBAnalyzer: generateNormalizationSuggestions called with ' + (variants ? variants.length : 0) + ' surname variants and ' + (givenNameVariantGroups ? givenNameVariantGroups.length : 0) + ' given-name groups');
    const suggestions = [];
    const processedSurnames = new Set();

    for (const variant of variants || []) {
      const norm1 = variant.variant1.name;
      const norm2 = variant.variant2.name;

      if (!processedSurnames.has(norm1) && !processedSurnames.has(norm2)) {
        const suggestion = {
          type: 'surname',
          primary: variant.recommendedNormalization,
          variants: [
            {
              name: variant.variant1.name,
              frequency: variant.variant1.frequency,
              items: surnameVariantItems[variant.variant1.name] || []
            },
            {
              name: variant.variant2.name,
              frequency: variant.variant2.frequency,
              items: surnameVariantItems[variant.variant2.name] || []
            }
          ],
          similarity: variant.similarity
        };

        this.enrichSuggestionWithGivenNameData(suggestion, givenNameVariantGroups);
        suggestions.push(suggestion);

        processedSurnames.add(norm1);
        processedSurnames.add(norm2);
      }
    }

    for (const group of givenNameVariantGroups || []) {
      if (!group || !group.surname || !Array.isArray(group.variants) || group.variants.length < 2) {
        continue;
      }

      const existing = suggestions.find(
        s => s.type === 'given-name' && (s.surname || '').toLowerCase() === group.surname.toLowerCase()
      );
      const variantDatasets = group.variants.map(variant => ({
        name: `${variant.firstName} ${group.surname}`.trim(),
        firstName: variant.firstName,
        lastName: group.surname,
        frequency: variant.frequency,
        items: variant.items || []
      }));

      if (existing) {
        existing.variants = this.mergeVariantLists(existing.variants, variantDatasets);
        existing.totalFrequency = (existing.totalFrequency || 0) + (group.totalFrequency || 0);
      } else {
        suggestions.push({
          type: 'given-name',
          surname: group.surname,
          normalizedGivenNameKey: group.normalizedKey,
          variants: variantDatasets,
          totalFrequency: group.totalFrequency,
          recommendedFirstName: group.recommendedFirstName,
          recommendedFullName: group.recommendedFullName,
          primary: group.recommendedFullName || `${variantDatasets[0]?.name || ''}`
        });
      }
    }

    Zotero.debug('ZoteroDBAnalyzer: Generated ' + suggestions.length + ' normalization suggestions (combined)');
    return suggestions;
  }

  enrichSuggestionWithGivenNameData(suggestion, givenNameVariantGroups) {
    if (!suggestion || !givenNameVariantGroups || givenNameVariantGroups.length === 0) {
      return suggestion;
    }

    const surname = (suggestion.primary || '').toLowerCase();
    if (!surname) {
      return suggestion;
    }

    const givenNameGroup = givenNameVariantGroups.find(group => group && (group.surname || '').toLowerCase() === surname);
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
  async applyNormalizationSuggestions(suggestions, autoConfirm = false) {
    if (typeof Zotero === 'undefined') {
      throw new Error('This method must be run in the Zotero context');
    }

    const results = {
      totalSuggestions: suggestions.length,
      applied: 0,
      skipped: 0,
      errors: 0
    };

    try {
      for (const suggestion of suggestions) {
        try {
          if (autoConfirm || await this.confirmNormalization(suggestion)) {
            // Apply the normalization mapping
            for (const variant of suggestion.variants) {
              if (variant.name !== suggestion.primary) {
                // Store mapping in learning engine
                await this.learningEngine.storeMapping(
                  variant.name,
                  suggestion.primary,
                  suggestion.similarity
                );
              }
            }
            results.applied++;
          } else {
            results.skipped++;
          }
        } catch (error) {
          console.error('Error applying normalization:', error);
          results.errors++;
        }
      }
    } catch (error) {
      console.error('Error in applyNormalizationSuggestions:', error);
      results.errors++;
    }

    return results;
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