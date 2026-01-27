# Plan: Fix HIGH Priority Performance Issues

## Issue 1: O(n²) Nested Loops in findFirstInitialVariations

**Location:** `src/core/candidate-finder.js:197-224`

### Current Implementation
```javascript
for (let i = 0; i < firstNames.length; i++) {
  for (let j = i + 1; j < firstNames.length; j++) {
    const name1 = firstNames[i];
    const name2 = firstNames[j];
    const distance = this.calculateLevenshteinDistance(name1, name2);
    // ... comparison
  }
}
```

### Problem
- O(k²) comparisons where k = number of unique first names
- For k=100, that's 4950 comparisons
- First name variations are often related by having the same initial

### Solution: Hash-Based Grouping by Initial
```javascript
// Group first names by their first letter/initial
const byInitial = {};
for (const name of firstNames) {
  const initial = name.charAt(0).toUpperCase();
  if (!byInitial[initial]) byInitial[initial] = [];
  byInitial[initial].push(name);
}

// Only compare names within the same initial group
for (const initial in byInitial) {
  const group = byInitial[initial];
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      // Compare only within group
    }
  }
}
```

### Expected Improvement
- From O(k²) to O(k² * p) where p = avg(1/26) ≈ 0.04
- For k=100: 4950 → ~190 comparisons (96% reduction)

### Edge Case
- Single-letter names like "J." need special handling - group them together
- Initials should match regardless of trailing period

---

## Issue 2: O(n²) Surname Comparison in findVariantsEfficiently

**Location:** `src/zotero/zotero-db-analyzer.js:410-479`

### Current Implementation
- Already has optimizations: length filtering, max comparisons limit
- Still O(n²) in worst case when names have similar lengths
- Uses Levenshtein distance for similarity calculation

### Problem
- For 10,000 surnames with similar lengths, still does ~10M comparisons
- Length filtering alone is insufficient

### Solution: N-Gram Indexing (Blocking)

1. **Create n-gram index:**
```javascript
function createNGramIndex(surnames, n = 2) {
  const index = {};
  for (const surname of surnames) {
    const ngrams = getNGrams(surname, n); // e.g., "smith" → ["sm", "mi", "it", "th"]
    for (const ngram of ngrams) {
      if (!index[ngram]) index[ngram] = [];
      index[ngram].push(surname);
    }
  }
  return index;
}
```

2. **Use blocking to limit comparisons:**
```javascript
// Only compare surnames that share at least one n-gram
// Use the most discriminative n-grams (appear in fewer surnames)
```

### Alternative: Sorted Neighborhood Method
```javascript
// Sort surnames and only compare nearby entries
const sorted = surnames.sort();
for (let i = 0; i < sorted.length; i++) {
  // Compare with next WINDOW_SIZE entries
  for (let j = 1; j < windowSize && i + j < sorted.length; j++) {
    compare(sorted[i], sorted[i + j]);
  }
}
```

### Recommended Approach: Combined Strategy
1. **Primary:** Sorted Neighborhood Method (simpler, effective)
   - Sort by surname
   - Compare each name with next N neighbors
   - Works well for typo-like variations (Smith vs Smyth)

2. **Secondary:** N-gram indexing for exact matches
   - Group by common 2-grams
   - Compare within groups

### Expected Improvement
- From O(n²) to O(n * w) where w = window size (e.g., 10-20)
- For n=10,000: 100M → 100K comparisons (99.9% reduction)

---

## Implementation Plan

### Phase 1: Fix findFirstInitialVariations (candidate-finder.js)
- [ ] Add helper function to extract initial from first name
- [ ] Group first names by initial (with special handling for initials)
- [ ] Modify loop to only compare within same initial group
- [ ] Add tests for edge cases (single letters, periods, etc.)
- [ ] Verify no regression in test results

### Phase 2: Fix findVariantsEfficiently (zotero-db-analyzer.js)
- [ ] Implement sorted neighborhood method
- [ ] Add configurable window size parameter
- [ ] Add tests for large surname lists
- [ ] Verify existing tests still pass

### Phase 3: Integration Testing
- [ ] Run full test suite
- [ ] Profile performance with large datasets
- [ ] Verify build completes without warnings

---

## Files to Modify
- `src/core/candidate-finder.js` - Add initial-based grouping
- `src/zotero/zotero-db-analyzer.js` - Add sorted neighborhood

## Test Strategy
1. Create test cases with known first name variants
2. Verify same results as original O(n²) implementation
3. Profile with synthetic large datasets
4. Compare results before/after to ensure correctness

## Success Criteria
- All existing tests pass
- No regression in matching accuracy
- Build completes without errors/warnings
- Performance improvement of 90%+ for large datasets
