/**
 * Zotero DB Analyzer - Handles database-specific queries for name analysis
 * This module uses Zotero's database APIs to efficiently extract and analyze names
 */
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
              if (creator && (creator.firstName || creator.lastName)) {
                const key = `${creator.firstName || ''}|${creator.lastName || ''}|${creator.fieldMode || 0}`;
                creatorsMap[key] = {
                  firstName: creator.firstName || '',
                  lastName: creator.lastName || '',
                  fieldMode: creator.fieldMode || 0,
                  count: (creatorsMap[key]?.count || 0) + 1
                };
              }
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
              if (creator && (creator.firstName || creator.lastName)) {
                const key = `${creator.firstName || ''}|${creator.lastName || ''}|${creator.fieldMode || 0}`;
                creatorsMap[key] = {
                  firstName: creator.firstName || '',
                  lastName: creator.lastName || '',
                  fieldMode: creator.fieldMode || 0,
                  count: (creatorsMap[key]?.count || 0) + 1
                };
              }
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

  /**
   * Analyze a list of creators for name variants
   * @param {Array} creators - Array of creator objects with occurrence counts
   * @returns {Object} Analysis results
   */
  async analyzeCreators(creators, progressCallback = null, shouldCancel = null) {
    Zotero.debug('ZoteroDBAnalyzer: analyzeCreators started with ' + (creators ? creators.length : 0) + ' creators');
    const surnameFrequencies = {};

    // Process each creator to extract surname frequencies
    for (const creator of creators) {
      const fullName = `${creator.firstName} ${creator.lastName}`.trim();
      const parsed = this.parseName(fullName);

      if (parsed.lastName) {
        const lastNameKey = parsed.lastName.toLowerCase().trim();
        surnameFrequencies[lastNameKey] = (surnameFrequencies[lastNameKey] || 0) + (creator.count || 1);
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

    // Generate normalization suggestions
    const suggestions = this.generateNormalizationSuggestions(potentialVariants);

    return {
      surnameFrequencies,
      potentialVariants,
      suggestions,
      totalUniqueSurnames: surnames.length,
      totalVariantGroups: potentialVariants.length
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
  generateNormalizationSuggestions(variants) {
    Zotero.debug('ZoteroDBAnalyzer: generateNormalizationSuggestions called with ' + (variants ? variants.length : 0) + ' variants');
    const suggestions = [];
    const processedSurnames = new Set();
    
    for (const variant of variants) {
      const norm1 = variant.variant1.name;
      const norm2 = variant.variant2.name;
      
      // Avoid duplicate suggestions
      if (!processedSurnames.has(norm1) && !processedSurnames.has(norm2)) {
        suggestions.push({
          primary: variant.recommendedNormalization,
          variants: [
            { name: variant.variant1.name, frequency: variant.variant1.frequency },
            { name: variant.variant2.name, frequency: variant.variant2.frequency }
          ],
          similarity: variant.similarity
        });
        
        processedSurnames.add(norm1);
        processedSurnames.add(norm2);
      }
    }
    
    Zotero.debug('ZoteroDBAnalyzer: Generated ' + suggestions.length + ' normalization suggestions');
    return suggestions;
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
  async confirmNormalization(suggestion) {
    // In a real implementation, this would show a UI dialog
    // For now, we'll auto-confirm for testing purposes
    return true;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoteroDBAnalyzer;
}