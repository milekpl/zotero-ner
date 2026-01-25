/**
 * Zotero DB Analyzer - Handles database-specific queries for name analysis
 * This module uses Zotero's database APIs to efficiently extract and analyze names
 */

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
          similarity: variant.similarity,
          surnameKey: (variant.recommendedNormalization || '').toLowerCase()
        };

        this.enrichSuggestionWithGivenNameData(suggestion, givenNameVariantGroups);

        if (this.shouldSkipSuggestionFromLearning(suggestion)) {
          processedSurnames.add(norm1);
          processedSurnames.add(norm2);
          continue;
        }

        suggestions.push(suggestion);

        processedSurnames.add(norm1);
        processedSurnames.add(norm2);
      }
    }

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
        const lastNameDisplay = this.toTitleCase(variant.lastName || group.surname);
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

          // Skip if this variant IS the normalized value
          const variantName = variant.name || '';
          if (this.stringsEqualIgnoreCase(variantName, normalizedValue)) continue;

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

        if (this.stringsEqualIgnoreCase(variantName, normalizedValue)) {
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