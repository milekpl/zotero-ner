# Author Normalization Performance Analysis

## Executive Summary

After deep analysis of the author normalization codebase, I've identified several significant performance bottlenecks that could be optimized to speed up analyzing author names. The most critical issues are in the similarity calculation algorithms, database analysis loops, and redundant parsing operations.

## Key Performance Bottlenecks Identified

### 1. **Jaro-Winkler Similarity Algorithm (HIGH IMPACT)**
**Location:** [`src/core/learning-engine.js`](src/core/learning-engine.js:396)

The current implementation has O(n²) complexity with nested loops for matching:
```javascript
for (let i = 0; i < s1_len; i++) {
  const start = Math.max(0, i - match_window);
  const end = Math.min(i + match_window + 1, s2_len);
  for (let j = start; j < end; j++) {
    // match checking
  }
}
```

**Problem:** This is called repeatedly in [`findSimilar()`](src/core/learning-engine.js:344) which iterates through ALL mappings for each query - O(m × n²) where m is the number of stored mappings.

### 2. **Levenshtein Distance Calculation (HIGH IMPACT)**
**Location:** [`src/core/candidate-finder.js`](src/core/candidate-finder.js:283) and [`src/utils/string-distance.js`](src/utils/string-distance.js:12)

Full matrix allocation for every comparison:
```javascript
const matrix = [];
for (let i = 0; i <= str2.length; i++) {
  matrix[i] = [i];
}
```

**Problem:** Used in [`findFirstInitialVariations()`](src/core/candidate-finder.js:159) with nested loops comparing all name pairs within surname groups. This creates O(n² × L²) complexity where L is name length.

### 3. **Redundant Name Parsing (MEDIUM-HIGH IMPACT)**
**Location:** [`src/zotero/zotero-db-analyzer.js`](src/zotero/zotero-db-analyzer.js:287)

In [`addCreatorOccurrence()`](src/zotero/zotero-db-analyzer.js:287), names are parsed multiple times:
- Once during initial grouping
- Again during variant detection
- Again during suggestion generation

**Problem:** Same names are parsed 3-4 times during a single analysis pass.

### 4. **Inefficient Storage Operations (MEDIUM IMPACT)**
**Location:** [`src/core/learning-engine.js`](src/core/learning-engine.js:72)

Every mapping update triggers immediate storage save:
```javascript
async storeMapping(rawName, normalized, confidence = 1.0, context = {}) {
  // ... update logic ...
  await this.saveMappings(); // Called on EVERY update!
}
```

**Problem:** For batch operations, this causes excessive I/O.

### 5. **Unnecessary Similarity Calculations (MEDIUM IMPACT)**
**Location:** [`src/core/learning-engine.js`](src/core/learning-engine.js:378)

Three different similarity metrics are computed for every comparison:
```javascript
calculateSimilarity(str1, str2) {
  const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);
  const longestCommonSubsequence = this.lcsSimilarity(str1, str2);
  const initialMatching = this.initialMatchingSimilarity(str1, str2);
  return (jaroWinkler * 0.5) + (lcs * 0.3) + (initial * 0.2);
}
```

**Problem:** All three are always computed even when early rejection is possible.

### 6. **LCS Similarity Word-by-Word Comparison (MEDIUM IMPACT)**
**Location:** [`src/core/learning-engine.js`](src/core/learning-engine.js:458)

```javascript
for (const word1 of words1) {
  if (words2.some(word2 => this.isSimilarWord(word1, word2))) {
    matches++;
  }
}
```

**Problem:** Nested loop with `some()` creates O(n²) word comparisons.

### 7. **Repeated Canonical Key Generation (LOW-MEDIUM IMPACT)**
**Location:** [`src/core/learning-engine.js`](src/core/learning-engine.js:327)

The [`createCanonicalKey()`](src/core/learning-engine.js:327) function is called repeatedly for the same names:
```javascript
createCanonicalKey(name) {
  return name.trim()
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ');
}
```

**Problem:** No memoization - same computation repeated.

## Optimization Opportunities

### Immediate Wins (Easy to Implement)

1. **Memoize Canonical Keys**
   - Add a simple Map cache for [`createCanonicalKey()`](src/core/learning-engine.js:327)
   - Expected improvement: 10-20% for repeated names

2. **Batch Storage Operations**
   - Queue mapping updates and flush periodically
   - Expected improvement: 30-50% for batch operations

3. **Early Exit in Similarity Calculations**
   - Check exact match first, then quick rejection
   - Expected improvement: 20-30% for dissimilar names

### Medium Effort (Good ROI)

4. **Optimize Levenshtein Distance**
   - Use iterative approach with O(min(n,m)) space
   - Early termination when threshold exceeded
   - Expected improvement: 40-60% for long names

5. **Cache Parsed Names**
   - Store parsed results in a Map keyed by raw name
   - Expected improvement: 25-40% for analysis operations

6. **Pre-filter Before Similarity Check**
   - Use length difference and first-character checks
   - Expected improvement: 30-50% reduction in expensive comparisons

### High Impact (More Complex)

7. **Index Mappings by Canonical Key Prefix**
   - Create a prefix tree or hash-based index
   - Only compare against candidates with shared prefix
   - Expected improvement: 60-80% for large mapping sets

8. **Web Worker for Analysis**
   - Move heavy computation off main thread
   - Expected improvement: Non-blocking UI, better perceived performance

9. **Incremental Analysis**
   - Only analyze new/changed items instead of full library scan
   - Expected improvement: 70-90% for subsequent analyses

## Recommended Priority Order

1. **Memoize canonical keys** (1 hour, 10-20% improvement)
2. **Add early exit to similarity functions** (2 hours, 20-30% improvement)
3. **Cache parsed names** (3 hours, 25-40% improvement)
4. **Batch storage operations** (4 hours, 30-50% improvement)
5. **Optimize Levenshtein with early termination** (4 hours, 40-60% improvement)
6. **Implement prefix-based indexing** (1 day, 60-80% improvement)

## Potential Overall Speedup

Combining these optimizations could yield:
- **2-3x faster** for single-name normalization
- **5-10x faster** for library-wide analysis
- **10-20x faster** for subsequent analyses with incremental updates

## Code Locations for Key Bottlenecks

| Function | File | Line | Complexity |
|----------|------|------|------------|
| `jaroWinklerSimilarity` | learning-engine.js | 396 | O(n²) |
| `calculateLevenshteinDistance` | candidate-finder.js | 283 | O(n²) |
| `findSimilar` | learning-engine.js | 344 | O(m × n²) |
| `findFirstInitialVariations` | candidate-finder.js | 159 | O(n² × L²) |
| `lcsSimilarity` | learning-engine.js | 458 | O(w²) |
| `storeMapping` | learning-engine.js | 206 | I/O bound |
| `addCreatorOccurrence` | zotero-db-analyzer.js | 287 | Redundant parsing |
