# Manual Testing Guide

This guide provides instructions on how to manually test the Zotero NER Author Name Normalizer extension.

## 1. Installation

1.  Open Zotero.
2.  Go to `Tools` -> `Add-ons`.
3.  Click the gear icon in the top-right corner and select `Install Add-on From File...`.
4.  Navigate to the `dist` directory in this project and select the `.xpi` file (e.g., `zotero-ner-author-normalizer-1.0.0.xpi`).
5.  Click `Install Now` and then restart Zotero.

## 2. Testing the Normalization Dialog

1.  Add some items to your Zotero library with inconsistent author names. For example:
    *   `J. A. Fodor`
    *   `Jerry Fodor`
    *   `Fodor, J. A.`
    *   `J. Smith`
    *   `John Smith`

2.  Select one or more of these items in the Zotero item list.

3.  Right-click on the selected items and choose `Normalize Author Names with NER...` from the context menu. Alternatively, you can go to the `Tools` menu and select `Normalize Author Names with NER...`.

4.  The NER Author Name Normalizer dialog should appear.

## 3. Verifying the Dialog Functionality

1.  **Item List:** The dialog should display the list of items you selected.

2.  **Suggestions:** For each item, the dialog should show the original author name and a list of suggested normalizations. The suggestions should be based on the NER processing and variant generation logic.

3.  **Variant Selection:** You should be able to select a normalization variant for each author.

4.  **Apply Normalizations:** Click the `Apply Selected` button. The dialog should close, and the author names in your Zotero library should be updated with the selected normalizations.

5.  **Learned Mappings:** If you normalize a name, the extension should learn the mapping. The next time you encounter the same name, it should be automatically normalized or the learned mapping should be suggested.

## 4. Batch Processing

1.  Select a large number of items (e.g., 10 or more) with various author names.

2.  Open the normalization dialog.

3.  The dialog should show a progress bar as it processes the items.

4.  You should be able to review the suggestions for each item and apply the normalizations in batches.

## 5. Edge Cases

*   Test with items that have no authors.
*   Test with items that have multiple authors.
*   Test with names that have prefixes or suffixes (e.g., `van der Sar`, `Jr.`).
*   Test with non-ASCII characters in author names.
