# Zotero Name Normalizer

A Zotero 7/8 extension that normalizes author names in Zotero libraries.

## Status

**Fully functional** - Extension loads in Zotero 8, displays UI menu, opens dialogs with all normalization options available. While the extension has been tested, it is still in the early stages of development and may contain bugs. Please report any issues you encounter. Remember to make the backup copy of your library, which is found in your Zotero profile. The analysis does not affect the library, but normalization is irreversible.

## Problem Solved

Academic metadata contains author names in various formats:
- Jerry Alan Fodor vs Jerry A. Fodor vs Jerry Fodor vs J.A. Fodor
- Inconsistent handling of Spanish double surnames
- Prefixes like "van", "de", "la" often misplaced

This plugin normalizes them to a single, consistent format. This is how you can avoid having multiple names of a single author. Without normalizing, you might have the same author listed as multiple distinct authors in your References, and multiple references in the same paper, such as `(Fodor 1990)`, `(J. Fodor 1990)`, and `(Jerry A. Fodor 1990)`, even they are the same person. Removing these manually requires substantial effort, and in my own library, I found almost 500 such cases, even if I try to clean up found problems when I compile references.

# ![Screenshot](screenshot.png)

## Features

- **Name parsing**: Parses author names and identifies components
- **Variant generation**: Creates multiple normalized forms for user selection
- **Learning system**: Remembers user preferences for future suggestions
- **Zotero integration**: Seamlessly integrates with Zotero's interface
- **Batch processing**: Process multiple items at once

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for setup instructions, architecture details, and technical information.

## License

GPL-3.0

© 2026, Marcin Miłkowski
