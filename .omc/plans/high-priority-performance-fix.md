# Plan: Fix HIGH Priority Performance Issues

## Issue 1: O(n²) Nested Loops in findFirstInitialVariations

**Location:** `src/core/candidate-finder.js:197-224`

### Current Implementation
```javascript
for (let i = 0; i < firstNames.length; i++) {
  for (let j = i + 1; j < firstNames.length; j++) {
    const distance = this.calculateLevenshteinDistance(name1, name2);
    // ... comparison
  }
}
```

### Problem
- O(k²) comparisons where k = number of unique first names
- For k=100, that's 4950 comparisons

### Solution: First Letter + Length Bucket Grouping

Group by first letter AND name length bucket. This catches:
- Typos: "Smith" vs "Smythe" (both "S", ~5 chars)
- Initial variations: "J." vs "John" (both "J", different lengths)

```javascript
function getGroupingKey(firstName) {
  const len = firstName.length;
  const lengthBucket = len <= 3 ? 'tiny' : len <= 5 ? 'short' : len <= 8 ? 'medium' : 'long';
  const initial = firstName.charAt(0).toLowerCase();
  return `${initial}_${lengthBucket}`;
}

// Group first names by initial+length
const byGroup = {};
for (const name of firstNames) {
  const key = getGroupingKey(name);
  if (!byGroup[key]) byGroup[key] = [];
  byGroup[key].push(name);
}

// Only compare names within same group
for (const key in byGroup) {
  const group = byGroup[key];
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      compare(group[i], group[j]);
    }
  }
}
```

**Tradeoff Note:** This optimization targets typos and initial variations, NOT nickname variants (William/Bill). For nicknames, use the existing `COMMON_GIVEN_NAME_EQUIVALENTS` lookup instead of Levenshtein.

### Edge Cases Handled
- Single letters ("J.", "J") - same group (both "J_tiny")
- Multi-letter initials ("J.D.", "John") - "J_tiny" vs "J_medium" - different groups
- Hyphenated names - use first letter before hyphen
- Unicode - handled by charAt and toLowerCase

### Expected Improvement
- From O(k²) to O(k² * p) where p ≈ 1/156 (26 letters × 4 length buckets)
- For k=100: 4950 → ~32 comparisons (99.4% reduction)

---

## Issue 2: O(n²) Surname Comparison in findVariantsEfficiently

**Location:** `src/zotero/zotero-db-analyzer.js:410-479`

### Current Implementation
- Already has: length filtering (within 2 chars), max comparisons limit (n*5)
- Still O(n²) for surnames of similar lengths

### Problem
- For 10,000 surnames, ~10M comparisons in worst case
- Alphabetical sorting alone doesn't correlate with edit distance

### Solution: 2-Gram Blocking Index

```javascript
function create2GramIndex(surnames) {
  const index = {};
  for (const surname of surnames) {
    const ngrams = get2Grams(surname.toLowerCase());
    for (const ngram of ngrams) {
      if (!index[ngram]) index[ngram] = new Set();
      index[ngram].add(surname);
    }
  }
  return index;
}

function get2Grams(str) {
  const grams = new Set();
  for (let i = 0; i < str.length - 1; i++) {
    grams.add(str.substring(i, i + 2));
  }
  return grams;
}
```

**Comparison strategy:**
1. Build 2-gram index for all surnames
2. For each surname, get candidates from shared n-gram buckets
3. Only compare with candidates (not all other surnames)
4. Apply existing length filter and similarity threshold

### Why 2-Gram Over Sorted Neighborhood?
- "Smith" shares "sm", "mi", "it", "th" with similar names
- Better for typo detection (1-2 character differences)
- More discriminative than alphabetical position

### Expected Improvement
- From O(n²) to O(n × avg_bucket_size)
- For n=10,000 with avg_bucket_size=50: 100M → 500K (99.5% reduction)

---

## Implementation Plan

### Phase 1: Fix findFirstInitialVariations (candidate-finder.js)
- [ ] Add `getGroupingKey()` helper function
- [ ] Modify loop to use initial+length grouping
- [ ] Add tests for edge cases (single letters, unicode, hyphens)
- [ ] Add regression test comparing old vs new results
- [ ] Verify existing tests still pass

### Phase 2: Fix findVariantsEfficiently (zotero-db-analyzer.js)
- [ ] Add `get2Grams()` helper function
- [ ] Add `create2GramIndex()` helper function
- [ ] Implement blocking-based comparison
- [ ] Add tests with synthetic surname datasets
- [ ] Verify existing tests still pass

### Phase 3: Integration Testing
- [ ] Run full test suite
- [ ] Profile performance with synthetic large datasets
- [ ] Compare matching accuracy before/after
- [ ] Verify build completes without warnings

---

## Files to Modify
- `src/core/candidate-finder.js` - Add grouping optimization
- `src/zotero/zotero-db-analyzer.js` - Add n-gram blocking

## Test Cases to Add

### candidate-finder.js Tests
```javascript
// Edge case: Single letter vs full name
test('matches J. with John', () => {
  const creators = [
    { firstName: 'J.', lastName: 'Smith' },
    { firstName: 'John', lastName: 'Smith' }
  ];
  const result = findFirstInitialVariations(creators);
  expect(result).toHaveLength(1);
});

// Edge case: Similar length names
test('matches similar length names efficiently', () => {
  const creators = generateCreatorsWithFirstNames(['Smith', 'Smythe', 'Jones']);
  const result = findFirstInitialVariations(creators);
  expect(result.length).toBeGreaterThan(0);
});

// Edge case: Unicode handling
test('handles accented characters', () => {
  const creators = [
    { firstName: 'Jose', lastName: 'Smith' },
    { firstName: 'José', lastName: 'Smith' }
  ];
  const result = findFirstInitialVariations(creators);
  expect(result.length).toBeGreaterThan(0);
});
```

### zotero-db-analyzer.js Tests
```javascript
// Performance test with large dataset
test('handles 1000 surnames efficiently', () => {
  const surnames = generateTestSurnames(1000);
  const start = Date.now();
  const result = findVariantsEfficiently(surnameFrequencies);
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(5000); // Should complete in < 5s
  expect(result.length).toBeGreaterThan(0);
});
```

## Success Criteria
- All existing tests pass
- No regression in matching accuracy (same pairs matched)
- Build completes without errors/warnings
- Performance improvement of 90%+ for large datasets
- Edge cases handled correctly

## Risk Mitigation
| Risk | Mitigation |
|------|------------|
| New grouping misses valid matches | Add regression test comparing old vs new results |
| N-gram index memory usage | Use Set for O(1) lookup, clean up after use |
| Edge case regressions | Add explicit tests for each edge case |
