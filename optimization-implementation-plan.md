# Author Normalization Performance Optimization - Implementation Plan

## Overview
This document provides a detailed, step-by-step implementation plan for optimizing the author normalization performance based on the analysis findings.

## Phase 1: Quick Wins (Estimated: 1-2 days)

### 1.1 Memoize Canonical Keys
**File:** [`src/core/learning-engine.js`](src/core/learning-engine.js)

**Current Code:**
```javascript
createCanonicalKey(name) {
  if (name == null) {
    return '';
  }
  return name.trim()
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ');
}
```

**Implementation:**
```javascript
constructor() {
  // ... existing code ...
  this.canonicalKeyCache = new Map();
  this.canonicalKeyCacheMaxSize = 10000; // Prevent unbounded growth
}

createCanonicalKey(name) {
  if (name == null) {
    return '';
  }
  
  // Check cache first
  if (this.canonicalKeyCache.has(name)) {
    return this.canonicalKeyCache.get(name);
  }
  
  const key = name.trim()
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ');
  
  // Simple LRU: if cache is full, clear half of it
  if (this.canonicalKeyCache.size >= this.canonicalKeyCacheMaxSize) {
    const entriesToDelete = Math.floor(this.canonicalKeyCacheMaxSize / 2);
    const keys = this.canonicalKeyCache.keys();
    for (let i = 0; i < entriesToDelete; i++) {
      this.canonicalKeyCache.delete(keys.next().value);
    }
  }
  
  this.canonicalKeyCache.set(name, key);
  return key;
}
```

**Testing:**
- Unit test: Verify cache returns same result as non-cached
- Performance test: Measure 1000 calls with same names

---

### 1.2 Add Early Exit to Similarity Calculations
**File:** [`src/core/learning-engine.js`](src/core/learning-engine.js)

**Current Code:**
```javascript
calculateSimilarity(str1, str2) {
  const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);
  const longestCommonSubsequence = this.lcsSimilarity(str1, str2);
  const initialMatching = this.initialMatchingSimilarity(str1, str2);
  return (jaroWinkler * 0.5) + (lcs * 0.3) + (initial * 0.2);
}
```

**Implementation:**
```javascript
calculateSimilarity(str1, str2) {
  // Early exit: exact match
  if (str1 === str2) return 1.0;
  
  // Early exit: empty strings
  if (!str1 || !str2) return 0.0;
  
  // Quick pre-filter: length difference check
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  const minLen = Math.min(len1, len2);
  
  // If length differs by more than 50%, similarity will be low
  if (minLen / maxLen < 0.5) {
    return 0.0;
  }
  
  // First character mismatch check (for names, first letter usually matches)
  if (str1[0]?.toLowerCase() !== str2[0]?.toLowerCase()) {
    // Still compute but with reduced expectation
    const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);
    if (jaroWinkler < 0.5) {
      return jaroWinkler * 0.5; // Quick return with reduced weight
    }
  }
  
  const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);
  
  // Early exit if Jaro-Winkler is already below threshold
  if (jaroWinkler < 0.3) {
    return jaroWinkler * 0.5;
  }
  
  const longestCommonSubsequence = this.lcsSimilarity(str1, str2);
  const initialMatching = this.initialMatchingSimilarity(str1, str2);
  
  return (jaroWinkler * LearningEngine.JARO_WINKLER_WEIGHT) +
         (longestCommonSubsequence * LearningEngine.LCS_WEIGHT) +
         (initialMatching * LearningEngine.INITIAL_MATCHING_WEIGHT);
}
```

---

### 1.3 Cache Parsed Names
**File:** [`src/core/name-parser.js`](src/core/name-parser.js)

**Implementation:**
```javascript
class NameParser {
  constructor() {
    this.prefixes = NAME_PREFIXES;
    this.suffixes = NAME_SUFFIXES;
    this.initialPattern = /^[A-Z]\.?$/;
    this.initialsPattern = /^[A-Z]\.[A-Z]\.?$/;
    this.parseCache = new Map();
    this.cacheMaxSize = 5000;
  }

  parse(rawName) {
    // Check cache
    if (this.parseCache.has(rawName)) {
      return this.parseCache.get(rawName);
    }
    
    const result = this._doParse(rawName);
    
    // Cache management
    if (this.parseCache.size >= this.cacheMaxSize) {
      const entriesToDelete = Math.floor(this.cacheMaxSize / 2);
      const keys = this.parseCache.keys();
      for (let i = 0; i < entriesToDelete; i++) {
        this.parseCache.delete(keys.next().value);
      }
    }
    
    this.parseCache.set(rawName, result);
    return result;
  }
  
  _doParse(rawName) {
    // Move existing parse logic here
    // ... existing parse code ...
  }
}
```

---

## Phase 2: Algorithm Optimizations (Estimated: 2-3 days)

### 2.1 Optimize Levenshtein Distance with Early Termination
**File:** [`src/utils/string-distance.js`](src/utils/string-distance.js)

**Implementation:**
```javascript
/**
 * Calculate Levenshtein distance with early termination
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} maxDistance - Maximum distance to compute (early termination)
 * @returns {number} Levenshtein distance or maxDistance+1 if exceeded
 */
function levenshteinDistance(str1, str2, maxDistance = Infinity) {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;
  
  // Ensure str1 is the shorter string for space optimization
  if (str1.length > str2.length) {
    [str1, str2] = [str2, str1];
  }
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Early termination: if length diff exceeds maxDistance
  if (len2 - len1 > maxDistance) {
    return maxDistance + 1;
  }
  
  // Use two rows instead of full matrix (O(min(n,m)) space)
  let prevRow = new Array(len1 + 1);
  let currRow = new Array(len1 + 1);
  
  for (let j = 0; j <= len1; j++) {
    prevRow[j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    currRow[0] = i;
    let minInRow = currRow[0];
    
    for (let j = 1; j <= len1; j++) {
      const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      );
      minInRow = Math.min(minInRow, currRow[j]);
    }
    
    // Early termination check
    if (minInRow > maxDistance) {
      return maxDistance + 1;
    }
    
    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }
  
  return prevRow[len1];
}

/**
 * Calculate normalized Levenshtein similarity with threshold
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} threshold - Minimum similarity (0-1) for early termination
 * @returns {number} Similarity score between 0 and 1
 */
function normalizedLevenshtein(str1, str2, threshold = 0) {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;
  
  const maxLen = Math.max(len1, len2);
  const maxDistance = Math.floor(maxLen * (1 - threshold));
  
  const distance = levenshteinDistance(str1, str2, maxDistance);
  
  if (distance > maxDistance) {
    return 0; // Below threshold
  }
  
  return 1 - (distance / maxLen);
}
```

---

### 2.2 Batch Storage Operations
**File:** [`src/core/learning-engine.js`](src/core/learning-engine.js)

**Implementation:**
```javascript
constructor() {
  // ... existing code ...
  this.pendingSaves = new Map();
  this.saveTimeout = null;
  this.saveDelay = 1000; // 1 second batching
  this.isBatchingEnabled = true;
}

async storeMapping(rawName, normalized, confidence = 1.0, context = {}) {
  const canonicalKey = this.createCanonicalKey(rawName);
  const now = Date.now();
  
  // Update in-memory map
  if (this.mappings.has(canonicalKey)) {
    const existing = this.mappings.get(canonicalKey);
    existing.normalized = normalized;
    existing.confidence = Math.max(existing.confidence, confidence);
    existing.lastUsed = now;
    existing.usageCount = (existing.usageCount || 0) + 1;
    existing.context = { ...existing.context, ...context };
  } else {
    this.mappings.set(canonicalKey, {
      raw: rawName,
      normalized: normalized,
      timestamp: now,
      lastUsed: now,
      confidence: confidence,
      usageCount: 1,
      context: context
    });
  }
  
  // Queue for batch save
  if (this.isBatchingEnabled) {
    this.pendingSaves.set(canonicalKey, true);
    this.scheduleSave();
  } else {
    await this.saveMappings();
  }
}

scheduleSave() {
  if (this.saveTimeout) {
    clearTimeout(this.saveTimeout);
  }
  
  this.saveTimeout = setTimeout(() => {
    this.flushPendingSaves();
  }, this.saveDelay);
}

async flushPendingSaves() {
  if (this.pendingSaves.size === 0) return;
  
  this.pendingSaves.clear();
  await this.saveMappings();
}

// Call this before app shutdown or critical operations
async forceSave() {
  if (this.saveTimeout) {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = null;
  }
  await this.flushPendingSaves();
}
```

---

## Phase 3: Advanced Optimizations (Estimated: 3-5 days)

### 3.1 Prefix-Based Indexing for Mappings
**File:** [`src/core/learning-engine.js`](src/core/learning-engine.js)

**Implementation:**
```javascript
constructor() {
  // ... existing code ...
  this.prefixIndex = new Map(); // prefix -> Set of canonical keys
  this.indexPrefixLength = 3;
}

async storeMapping(rawName, normalized, confidence = 1.0, context = {}) {
  const canonicalKey = this.createCanonicalKey(rawName);
  
  // ... existing storage logic ...
  
  // Update prefix index
  this.addToPrefixIndex(canonicalKey);
}

addToPrefixIndex(canonicalKey) {
  const prefix = canonicalKey.substring(0, this.indexPrefixLength).toLowerCase();
  
  if (!this.prefixIndex.has(prefix)) {
    this.prefixIndex.set(prefix, new Set());
  }
  this.prefixIndex.get(prefix).add(canonicalKey);
  
  // Also add to shorter prefix indexes for partial matching
  for (let i = 1; i < this.indexPrefixLength; i++) {
    const shortPrefix = canonicalKey.substring(0, i).toLowerCase();
    if (!this.prefixIndex.has(shortPrefix)) {
      this.prefixIndex.set(shortPrefix, new Set());
    }
    this.prefixIndex.get(shortPrefix).add(canonicalKey);
  }
}

findSimilar(name) {
  const query = this.createCanonicalKey(name);
  const results = [];
  
  // Get candidate keys from prefix index
  const candidates = this.getCandidateKeys(query);
  
  for (const key of candidates) {
    const mapping = this.mappings.get(key);
    if (!mapping) continue;
    
    const similarity = this.calculateSimilarity(query, key);
    
    if (similarity >= this.settings.confidenceThreshold) {
      results.push({
        ...mapping,
        similarity: similarity
      });
    }
  }
  
  // Sort by similarity descending, then by usage count
  return results.sort((a, b) => {
    if (b.similarity !== a.similarity) {
      return b.similarity - a.similarity;
    }
    return (b.usageCount || 0) - (a.usageCount || 0);
  }).slice(0, this.settings.maxSuggestions);
}

getCandidateKeys(query) {
  const candidates = new Set();
  
  // Get keys sharing the same prefix
  for (let i = this.indexPrefixLength; i > 0; i--) {
    const prefix = query.substring(0, i).toLowerCase();
    const keys = this.prefixIndex.get(prefix);
    if (keys) {
      keys.forEach(key => candidates.add(key));
    }
  }
  
  // If no candidates found, fall back to all keys
  if (candidates.size === 0) {
    return this.mappings.keys();
  }
  
  return candidates;
}
```

---

### 3.2 Optimize Candidate Finder with Blocking
**File:** [`src/core/candidate-finder.js`](src/core/candidate-finder.js)

**Current Implementation:** Uses nested loops with Levenshtein distance

**Optimized Implementation:**
```javascript
findFirstInitialVariations(creators) {
  // Group by first initial for early filtering
  const byInitial = new Map();
  
  for (const creator of creators) {
    const firstName = (creator.firstName || '').trim().toLowerCase();
    if (!firstName) continue;
    
    const initial = firstName.charAt(0);
    if (!byInitial.has(initial)) {
      byInitial.set(initial, []);
    }
    byInitial.get(initial).push({ creator, firstName });
  }
  
  const variantGroups = [];
  
  // Only compare within same initial groups
  for (const [initial, group] of byInitial) {
    if (group.length < 2) continue;
    
    // Further block by length buckets
    const byLengthBucket = new Map();
    for (const item of group) {
      const len = item.firstName.length;
      const bucket = len <= 3 ? 'tiny' : len <= 6 ? 'short' : len <= 10 ? 'medium' : 'long';
      if (!byLengthBucket.has(bucket)) {
        byLengthBucket.set(bucket, []);
      }
      byLengthBucket.get(bucket).push(item);
    }
    
    // Compare only within same length buckets
    for (const [bucket, bucketGroup] of byLengthBucket) {
      if (bucketGroup.length < 2) continue;
      
      // Use optimized comparison
      for (let i = 0; i < bucketGroup.length; i++) {
        for (let j = i + 1; j < bucketGroup.length; j++) {
          const name1 = bucketGroup[i].firstName;
          const name2 = bucketGroup[j].firstName;
          
          // Quick length check before expensive calculation
          if (Math.abs(name1.length - name2.length) > 3) continue;
          
          // Use normalized Levenshtein with threshold
          const similarity = normalizedLevenshtein(name1, name2, 0.6);
          
          if (similarity >= 0.6) {
            variantGroups.push({
              surname: creators[0].lastName,
              variant1: { firstName: name1, frequency: 1 },
              variant2: { firstName: name2, frequency: 1 },
              similarity: similarity
            });
          }
        }
      }
    }
  }
  
  return variantGroups;
}
```

---

## Phase 4: Architecture Improvements (Estimated: 5-7 days)

### 4.1 Incremental Analysis Support
**File:** [`src/zotero/zotero-db-analyzer.js`](src/zotero/zotero-db-analyzer.js)

**Implementation:**
```javascript
constructor() {
  // ... existing code ...
  this.analyzedItemIds = new Set();
  this.lastAnalysisTimestamp = 0;
  this.analysisCacheKey = 'name_normalizer_analysis_cache';
  this.loadAnalysisCache();
}

async analyzeFullLibrary(progressCallback = null, shouldCancel = null, options = {}) {
  const { incremental = true, forceFull = false } = options;
  
  // Use Zotero.Search API to get all items with creators
  const search = new Zotero.Search();
  search.addCondition('libraryID', 'is', Zotero.Libraries.userLibraryID);
  
  if (incremental && !forceFull && this.lastAnalysisTimestamp > 0) {
    // Only get items modified since last analysis
    const date = new Date(this.lastAnalysisTimestamp);
    search.addCondition('dateModified', 'isAfter', date.toISOString());
  }
  
  const itemIDs = await search.search();
  
  if (itemIDs.length === 0 && incremental) {
    console.log('No new items to analyze');
    return this.getCachedResults();
  }
  
  // ... rest of analysis logic ...
  
  // Update cache
  this.lastAnalysisTimestamp = Date.now();
  this.saveAnalysisCache();
}
```

---

### 4.2 Web Worker Integration (Optional)
**File:** Create [`src/workers/normalization-worker.js`](src/workers/normalization-worker.js)

```javascript
// Worker for offloading heavy normalization tasks
self.onmessage = function(e) {
  const { type, data, id } = e.data;
  
  switch (type) {
    case 'ANALYZE_CREATORS':
      const results = analyzeCreators(data.creators);
      self.postMessage({ type: 'RESULT', id, results });
      break;
      
    case 'FIND_SIMILAR':
      const similar = findSimilarNames(data.name, data.mappings);
      self.postMessage({ type: 'RESULT', id, results: similar });
      break;
  }
};

function analyzeCreators(creators) {
  // Move heavy computation here
}
```

---

## Implementation Timeline

| Phase | Task | Estimated Time | Dependencies |
|-------|------|----------------|--------------|
| 1.1 | Memoize canonical keys | 2 hours | None |
| 1.2 | Early exit in similarity | 3 hours | None |
| 1.3 | Cache parsed names | 3 hours | None |
| 2.1 | Optimize Levenshtein | 6 hours | None |
| 2.2 | Batch storage | 4 hours | None |
| 3.1 | Prefix-based indexing | 1 day | 1.1 |
| 3.2 | Optimize candidate finder | 1 day | 2.1 |
| 4.1 | Incremental analysis | 2 days | None |
| 4.2 | Web worker | 2 days | None |

**Total Estimated Time:** 7-10 days

---

## Testing Strategy

### Unit Tests
1. Cache correctness tests
2. Similarity algorithm accuracy tests
3. Storage batching tests

### Performance Tests
```javascript
// Benchmark harness
class PerformanceBenchmark {
  static async run() {
    const results = {
      before: {},
      after: {}
    };
    
    // Test 1: Single name normalization
    const testNames = generateTestNames(1000);
    results.before.single = await benchmarkNormalization(testNames, 'before');
    results.after.single = await benchmarkNormalization(testNames, 'after');
    
    // Test 2: Library analysis
    results.before.analysis = await benchmarkAnalysis(largeLibrary, 'before');
    results.after.analysis = await benchmarkAnalysis(largeLibrary, 'after');
    
    // Test 3: Similarity search
    results.before.similarity = await benchmarkSimilaritySearch('before');
    results.after.similarity = await benchmarkSimilaritySearch('after');
    
    return results;
  }
}
```

### Regression Tests
- Ensure normalized results match before/after optimization
- Test edge cases (empty names, special characters, Unicode)
- Verify storage persistence

---

## Rollback Plan

Each optimization should be:
1. Implemented behind a feature flag
2. Tested in isolation
3. Validated against baseline performance
4. Gradually enabled in production

Feature flags:
```javascript
const OPTIMIZATIONS = {
  CANONICAL_KEY_CACHE: true,
  EARLY_EXIT_SIMILARITY: true,
  PARSED_NAME_CACHE: true,
  BATCH_STORAGE: true,
  OPTIMIZED_LEVENSHTEIN: true,
  PREFIX_INDEXING: false, // Enable after validation
  INCREMENTAL_ANALYSIS: false // Enable after validation
};
```

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Single normalization | ~5ms | <2ms | Average of 1000 calls |
| Library analysis (10k items) | ~30s | <10s | Full analysis time |
| Similarity search | ~100ms | <20ms | Search 1000 mappings |
| Memory usage | Baseline | <2x baseline | Peak heap size |
| Cache hit rate | N/A | >70% | Cache statistics |
