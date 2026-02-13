# Field Normalization

The Field Normalization feature provides intelligent, learned normalization for Zotero item fields beyond author names. It supports **publisher names**, **locations**, and **journal names** with automatic variant generation, learned mappings, and collection-based scope limitation.

## Overview

Field normalization addresses common inconsistencies in bibliographic metadata:

- **Publisher Names**: Variations like "Springer-Verlag", "Springer Science+Business Media", "John Wiley & Sons" can be normalized to consistent forms
- **Locations**: State abbreviations (IL, CA), multi-location entries (Boston, MA; Chicago, IL), and formatting inconsistencies
- **Journal Names**: Abbreviations (J. Comp. Ling.) vs full names (Journal of Computational Linguistics)

The system learns from your corrections and applies them automatically to similar entries.

## Accessing Field Normalization

Field normalization is available through the Zotero menu:

1. Select items in your Zotero library
2. Go to **Tools > Zotero NER** in the menu bar
3. Choose one of the normalization options:
   - **Normalize Publisher Data**
   - **Normalize Location Data**
   - **Normalize Journal Data**

## Publisher Normalization

### What It Normalizes

Publisher normalization handles variations in how publisher names appear across your library:

| Original Value | Normalized Form |
|----------------|-----------------|
| "Springer-Verlag" | "Springer" |
| "John Wiley & Sons" | "Wiley" |
| "Wiley-Blackwell" | "Wiley" |
| "Elsevier BV" | "Elsevier" |
| "Taylor & Francis Group" | "Taylor and Francis" |
| "Cambridge University Press" | "Cambridge UP" |
| "Oxford University Press" | "Oxford UP" |

### Transformation Rules

1. **Separator Normalization**: Converts various separators to consistent forms:
   - `;`, `/`, `-`, `&`, ` and ` are normalized consistently

2. **Abbreviation Expansion**: Expands common publisher abbreviations:
   - `Co.` -> `Company`
   - `Inc.` -> `Incorporated`
   - `Ltd.` -> `Limited`
   - `Press.` -> `Press`

3. **Company Name Patterns**: Applies known publisher patterns:
   - Merges variations of major publishers (Springer, Wiley, Elsevier, Taylor & Francis)
   - Standardizes university press names

### Usage Example

```javascript
// When you normalize a publisher value
// Input: "Springer-Verlag / Cambridge University Press"
// Variants generated:
//   - "Springer and Cambridge University Press"
//   - "Springer and Cambridge UP"
//   - "Springer-Verlag and Cambridge UP"
//   - "Springer and Cambridge University Press"

// After you select "Springer and Cambridge UP"
// The system learns this mapping and applies it automatically
// to future items with similar publisher values
```

## Location Normalization

### What It Normalizes

Location normalization handles geographic data stored in the `place` field:

1. **State Abbreviation Expansion/Contraction**:
   - "Boston, MA" -> "Boston, Massachusetts"
   - "Austin, Texas" -> "Austin, TX"

2. **Multi-Location Splitting**:
   - "Boston, MA; Chicago, IL" -> splits into individual locations
   - "London / New York" -> splits into individual locations

3. **US State Support**: All 50 states plus DC are supported:
   - Full names: Alabama, Alaska, ..., Wyoming, District of Columbia
   - Abbreviations: AL, AK, ..., WY, DC

### Supported State Abbreviations

```javascript
const STATE_ABBREVIATIONS = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
};
```

### Usage Example

```javascript
// Input: "Springfield, Ill; Chicago, IL"
// After normalization:
//   - "Springfield, Illinois"
//   - "Chicago, Illinois"

// Input: "Berkeley, CA"
// After normalization (with full name preference):
//   - "Berkeley, California"
```

## Journal Normalization

### What It Normalizes

Journal normalization handles variations in publication titles:

1. **Abbreviation Expansion**:
   - "J." -> "Journal"
   - "Trans." -> "Transactions"
   - "Proc." -> "Proceedings"
   - "Int." -> "International"

2. **Title Case Variations**: Handles various capitalization patterns

3. **Conjunction Variations**: Handles "of", "and", "in" variations

### Transformation Rules

| Abbreviation | Expanded Form |
|--------------|---------------|
| J. | Journal |
| Trans. | Transactions |
| Proc. | Proceedings |
| Rev. | Review |
| Int. | International |
| Appl. | Applied |
| Sci. | Science |
| Comp. | Computer |
| Ling. | Linguistics |
| Math. | Mathematics |
| Phys. | Physics |
| Chem. | Chemistry |
| Biol. | Biology |
| Tech. | Technology |
| Res. | Research |
| Q. | Quarterly |
| Ann. | Annual |
| Bull. | Bulletin |

### Usage Example

```javascript
// Input: "J. Comp. Ling."
// Variants generated:
//   - "Journal of Computer Linguistics"
//   - "Computational Linguistics"
//   - "Journal of Computational Linguistics"
//   - "J. Computational Linguistics"

// Input: "IEEE Trans. Pattern Anal. Mach. Intell."
// Variants generated:
//   - "IEEE Transactions on Pattern Analysis and Machine Intelligence"
//   - "IEEE Trans. Pattern Anal. Mach. Intell."
//   - "Transactions on Pattern Analysis and Machine Intelligence"
```

## Collection Scope

### Understanding Collection Scope

Collection scope allows you to apply learned normalizations selectively within specific collections. This is useful when:

- Different collections have different normalization conventions
- You want to experiment with normalization without affecting your entire library
- You collaborate with others who have different preferences

### How Collection Scope Works

1. **Global Scope (Default)**: Learned mappings apply to your entire library
2. **Collection Scope**: Learned mappings apply only within a specific collection

When a scope is set:
- The system first checks collection-specific mappings
- Falls back to global mappings if no collection mapping exists
- New mappings are stored with the current collection scope

### Setting Collection Scope

Collection scope is set through the dialog interface:

1. Open the normalization dialog for any field type
2. Select a collection from the scope dropdown
3. Normalizations performed will be scoped to that collection

### Scope Priority

When processing items that belong to multiple collections:

1. Check collection-specific mappings for each collection
2. Use the first matching mapping found
3. Fall back to global mappings if no collection-specific match

## Tips and Best Practices

### Getting Started

1. **Start Small**: Begin with a small selection of items to understand how normalization works

2. **Review Suggestions**: Always review the suggested normalizations before applying them

3. **Use Collection Scope**: For large libraries, use collection scope to test and refine normalization rules

### Maintaining Consistency

1. **Be Consistent**: Apply the same normalization pattern each time you encounter similar values

2. **Review Periodically**: Periodically review normalized fields to catch inconsistencies

3. **Use Learning**: The system learns from your corrections - use this to your advantage

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Normalization not applying | Check if the field value matches learned mappings |
| Wrong normalization applied | Clear the learned mapping and re-apply the correct normalization |
| Collection scope not working | Verify the item belongs to the selected collection |
| Too many variants generated | The system generates all possible variants - select your preferred form |

### Resetting Learned Mappings

If you need to reset learned mappings:

1. Clear scoped mappings for a specific collection
2. Clear all scoped mappings to start fresh
3. Mappings are stored in browser localStorage

## Keyboard Shortcuts

The dialog supports standard keyboard navigation:

- `Tab` - Move between fields
- `Enter` - Accept selected normalization
- `Escape` - Cancel the dialog
- `Ctrl+A` (Windows/Linux) or `Cmd+A` (Mac) - Select all items

## Privacy Considerations

- Learned mappings are stored locally in your browser's localStorage
- No data is sent to external servers
- Mappings persist across Zotero sessions
