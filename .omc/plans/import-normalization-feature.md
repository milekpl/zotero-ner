# Auto-Normalization on Import - Work Plan

## Feature Summary

Hook into Zotero's notifier system to detect imported items, analyze for normalization candidates, show summary modal if conflicts exist (initials differ from standard), and apply user-confirmed changes.

## Requirements

- **Import Sources**: Web connectors, file imports (BibTeX, RIS), manual entry
- **Excluded**: Zotero sync
- **Flow**: Synchronous (user waits while items save + normalize)
- **Prompt**: Modal summary dialog listing all conflicts with batch actions
- **Settings**: Per-field toggles with defaults all enabled

## Fields to Normalize

| Field | Description |
|-------|-------------|
| Authors | Author names with initials |
| Publishers | Publisher names |
| Locations | Publication locations |
| Journals | Journal/book titles |

---

## Implementation Steps

### Phase 1: Notifier Observer

**Step 1.1** - Create new module `src/zotero/import-observer.js`
- Implement `ImportObserver` class
- Add `register()` method: `Zotero.Notifier.registerObserver(this, ['item'], 'zotero-ner-import', 50)`
- Add `notify(event, type, ids, extraData)` callback
- Handle only `event === 'add'` and `type === 'item'`
- Store observer ID for cleanup

**Step 1.2** - Handle shutdown/unload
- Add `unregister()` method to clean up observer
- Call from plugin's shutdown hook

### Phase 2: Item Processing

**Step 2.1** - Load new items from notifier
- Use `Zotero.Items.get(ids)` to load items from received IDs
- Filter for library items (not attachments, notes)
- Skip if item already processed (track in instance state)

**Step 2.2** - Analyze items for normalization candidates
- Use existing `ZoteroDBAnalyzer` to check each field type
- Compare imported value against normalized standard
- Track only changes where imported differs from normalized

**Step 2.3** - Check settings before processing
- Read from existing preferences/storage
- Respect per-field enable/disable toggles
- Skip disabled fields entirely

### Phase 3: Summary Dialog

**Step 3.1** - Extend existing dialog.html
- Add import-summary mode (new query param or flag)
- Display batch of changes grouped by field type
- Show: item title, field, imported value → normalized value
- Per-item checkboxes for include/exclude in batch

**Step 3.2** - Add action buttons
- "Apply All Selected" - apply batch
- "Apply Selected Only" - apply only checked items
- "Skip All" - ignore and close
- "Review Individually" - open full dialog for detailed review

**Step 3.3** - Handle dialog callbacks
- Return selected normalizations to apply
- Apply via existing `ItemProcessor` methods

### Phase 4: Settings UI

**Step 4.1** - Create settings dialog/chrome URL
- Add to existing Tools menu or create new preferences panel
- Toggle: "Auto-normalize on import" (default: on)
- Per-field toggles: Authors, Publishers, Locations, Journals (default: all on)

**Step 4.2** - Persist settings
- Use `Zotero.Prefs` or localStorage
- Key: `extensions.zotero-ner.importNormalize.*`

### Phase 5: Integration

**Step 5.1** - Register observer on plugin init
- Add to main plugin bootstrap/initialization
- Ensure proper load order (after Zotero ready)

**Step 5.2** - Add menu items
- Tools > Normalize on Import > Enable/Disable
- Tools > Normalize on Import > Configure...

**Step 5.3** - Testing
- Test web connector import
- Test BibTeX/RIS file import
- Test manual entry
- Verify sync is NOT triggered

---

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/zotero/import-observer.js` | Notifier observer for import events |
| `src/ui/import-summary-dialog.js` | Summary dialog controller |

### Modified Files

| File | Changes |
|------|---------|
| `src/index.js` | Export new modules |
| `src/zotero/menu-integration.js` | Add settings menu items |
| `content/dialog.html` | Add import-summary mode |
| `content/scripts/normalization-dialog-controller.js` | Handle import-summary mode |

---

## Acceptance Criteria

1. ✅ Observer registers on plugin startup without errors
2. ✅ New items from import trigger normalization analysis
3. ✅ Settings control which fields are processed
4. ✅ Summary dialog appears when conflicts exist
5. ✅ User can apply/skip batch changes
6. ✅ Works for web connectors, file imports, manual entry
7. ✅ Does NOT trigger for sync operations
8. ✅ Clean unregister on plugin shutdown
