# Plan: Dialog UI Improvements - Virtual Scrolling with Skip Learning

## Overview
Improve the author normalization dialog UX with virtual scrolling, progress tracking, and "not a duplicate" learning.

## Current Problems
1. All variant groups rendered at once (unbounded DOM growth)
2. No way to skip/ignore false positives permanently
3. Detail panel auto-selection depends on rendered indexes (fragile)

## Proposed Solution: Virtual Scroll with Progress Tracking

### Architecture

```
+-------------------------------------------------------------+
|  Progress: 12/87 (14%)  |  [Search Surname...]  [Filter v] |
+-------------------------+-----------------------------------+
|                                                             |
|  +-----------------------------------------------------+   |
|  | [12] Smith, John  |  5 items  |  [Mark Reviewed]   |   |
|  +-----------------------------------------------------+   |
|  | [08] Johnson, J.  |  3 items  |  [Mark Reviewed]   |   |
|  +-----------------------------------------------------+   |
|  | [04] Williams...  |  8 items  |  [Mark Reviewed]   |   |
|  +-----------------------------------------------------+   |
|  | ... (only ~20 rendered at a time)                   |   |
|  +-----------------------------------------------------+   |
|                                                             |
+-------------------------------------------------------------+
|  [Apply Selected]  [Skip This]  [Skip All Like This] [Done] |
+-------------------------------------------------------------+
```

## Implementation Plan

### Phase 1: Dynamic-Height Virtual Scroll
**File:** `content/dialog.html`

**Key Challenge:** Current cards have variable heights (variant pills, radio controls, custom inputs, related names sections)

**Solution: Position Absolute + Pre-measurement**

```javascript
class DynamicVirtualScroll {
  constructor(container, options = {}) {
    this.container = container;
    this.itemHeight = options.estimatedHeight || 80;
    this.buffer = options.buffer || 10;
    this.items = [];
    this.positions = [];
    this.measuredHeights = new Map();
  }

  setItems(items, renderFn) {
    this.items = items;
    this.positions = new Array(items.length + 1);
    let currentY = 0;
    for (let i = 0; i < items.length; i++) {
      this.positions[i] = currentY;
      currentY += this.measuredHeights.get(i) || this.itemHeight;
    }
    this.positions[items.length] = currentY;
    this.render();
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;

    const startIndex = this.findIndexNear(scrollTop);
    const endIndex = this.findIndexNear(scrollTop + viewportHeight);

    const renderStart = Math.max(0, startIndex - this.buffer);
    const renderEnd = Math.min(this.items.length, endIndex + this.buffer);

    this.container.innerHTML = '';
    for (let i = renderStart; i < renderEnd; i++) {
      const el = this.renderItem(this.items[i], i);
      el.style.position = 'absolute';
      el.style.top = this.positions[i] + 'px';
      el.style.width = '100%';
      this.container.appendChild(el);

      const height = el.getBoundingClientRect().height;
      this.measuredHeights.set(i, height);
    }
    this.recalculatePositions();
  }

  recalculatePositions() {
    let currentY = 0;
    for (let i = 0; i < this.items.length; i++) {
      this.positions[i] = currentY;
      currentY += this.measuredHeights.get(i) || this.itemHeight;
    }
  }
}
```

**Detail Panel Fix:**
```javascript
// Before (fragile):
if (renderedIndexes.includes(variantDetailState.suggestionIndex))

// After (robust):
const virtualIndex = this.itemToVirtualIndex.get(suggestionIndex);
```

### Phase 2: Skip/Not Duplicate with Learning
**Files:** `content/dialog.html`, `src/core/learning-engine.js`

**Skip Key Format:**
```
ner:skip:{surnameHash}:{firstNamePatternHash}

Example: ner:skip:7a3f2b:9c1d4e
```

**Implementation:**
```javascript
// learning-engine.js additions
const SKIP_STORAGE_KEY = 'ner_skipped_suggestions';

recordSkipDecision(surname, firstNamePattern) {
  const key = this.generateSkipKey(surname, firstNamePattern);
  const skipped = this.getSkippedPairs();
  skipped.add(key);
  this.saveSkippedPairs(skipped);
}

generateSkipKey(surname, firstNamePattern) {
  const s = surname.toLowerCase().trim();
  const f = firstNamePattern.toLowerCase().trim();
  const sHash = s.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0).toString(16);
  const fHash = f.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0).toString(16);
  return `ner:skip:${sHash}:${fHash}`;
}

shouldSkipSuggestion(suggestion) {
  const key = this.generateSkipKey(suggestion.surname, suggestion.firstNamePattern);
  return this.getSkippedPairs().has(key);
}
```

**Storage:** localStorage for web, Zotero.Prefs for production sync

### Phase 3: Progress Tracking (Enhancement)
**Files:** `content/dialog.html` - ENHANCE existing implementation

Enhance existing progress tracking:
- Per-item reviewed count
- Skip count display
- Sticky header

### Phase 4: Batch Actions & UI Polish
**Files:** `content/dialog.html`

- "Mark All Reviewed"
- "Skip All Like This"  
- "Apply Selected"
- Sticky progress header

## Files to Create
- `src/utils/virtual-scroll.js` - Dynamic virtual scroll manager

## Files to Modify
- `content/dialog.html` - Virtual scroll + skip buttons
- `src/core/learning-engine.js` - Skip learning methods

## Edge Cases Handled

| Edge Case | Solution |
|-----------|----------|
| 0 items | Show empty state, don't init virtual scroll |
| Rapid scrolling | Debounce render, requestAnimationFrame |
| Filter changes | Reset scroll position |
| Window resize | Refresh to recalculate |
| Detail panel sync | Use suggestionIndex mapping |

## Success Criteria
- [ ] Virtual scroll renders 1000+ suggestions in < 100ms
- [ ] Skip decisions persist across sessions
- [ ] Progress tracking shows reviewed/skipped/applied
- [ ] All existing tests pass
- [ ] No detail panel regressions
