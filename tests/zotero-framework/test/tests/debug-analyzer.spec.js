/**
 * Debug test to check what the analyzer actually finds with the fixtures
 */

describe('Analyzer Debug - What does it actually find?', function() {
    this.timeout(60000);

    it('should analyze library and log all detected variants', async function() {
        await Zotero.initializationPromise;
        
        if (!Zotero.NameNormalizer?.menuIntegration?.zoteroDBAnalyzer) {
            Zotero.debug('Analyzer DEBUG: No analyzer available');
            this.skip();
            return;
        }

        const analyzer = Zotero.NameNormalizer.menuIntegration.zoteroDBAnalyzer;
        
        // Get all items in library
        const items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID);
        console.log('Analyzer DEBUG: Total items in library: ' + items.length);
        
        // Get all creators and track Miłkowski specifically
        const creators = [];
        let milkowskiCount = 0;
        for (const item of items) {
            const itemCreators = item.getCreators?.();
            if (itemCreators && itemCreators.length > 0) {
                for (const creator of itemCreators) {
                    creators.push({
                        firstName: creator.firstName || '',
                        lastName: creator.lastName || '',
                        creatorType: creator.creatorType || 'author'
                    });
                    if ((creator.lastName || '').toLowerCase().includes('milkowski')) {
                        milkowskiCount++;
                        console.log('Analyzer DEBUG: Found Miłkowski/Milkowski variant: ' + 
                            creator.firstName + ' ' + creator.lastName);
                    }
                }
            }
        }
        
        console.log('Analyzer DEBUG: Total creators found: ' + creators.length);
        console.log('Analyzer DEBUG: Total Miłkowski/Milkowski creators: ' + milkowskiCount);
        
        // Count unique surnames
        const surnames = new Set();
        creators.forEach(c => {
            if (c.lastName) surnames.add(c.lastName);
        });
        console.log('Analyzer DEBUG: Unique surnames: ' + surnames.size);
        console.log('Analyzer DEBUG: Surnames: ' + Array.from(surnames).join(', '));
        
        // Run analyzer
        try {
            const results = await analyzer.analyzeFullLibrary();
            
            console.log('Analyzer DEBUG: Analysis complete');
            console.log('Analyzer DEBUG: Total variant groups: ' + (results.suggestions?.length || 0));
            
            if (results.suggestions && results.suggestions.length > 0) {
                console.log('Analyzer DEBUG: Found variant groups:');
                for (const group of results.suggestions) {
                    const variantNames = group.variants?.map(v => v.name).join(' / ');
                    console.log('  - Primary: ' + group.primary + ', Variants: ' + variantNames);
                }
            } else {
                console.log('Analyzer DEBUG: NO VARIANT GROUPS FOUND');
            }
            
            assert.ok(results, 'Analysis should return results');
        } catch (e) {
            console.log('Analyzer DEBUG: Error during analysis: ' + e.message);
            throw e;
        }
    });
});
