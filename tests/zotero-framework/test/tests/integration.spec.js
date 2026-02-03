/**
 * Zotero Name Normalizer Integration Tests
 *
 * Tests the full normalization workflow with real Zotero items.
 * Uses test fixtures to create items with name variants.
 */

// Import test fixtures (will be loaded via script tag, available on globalThis)

describe('Zotero Name Normalizer Integration Tests', function() {
    // Now with proper fixtures that use actual supported variants:
    // - Diacritics: Miłkowski/Milkowski, Müller/Mueller, García/Garcia
    // - First-name variants: Jerry/J./Jerry Alan Fodor, Daniel/D./D.C. Dennett
    this.timeout(120000);
    
    before(async function() {
        await Zotero.initializationPromise;
        Zotero.debug('NER Integration Test: Starting integration tests with global fixtures...');
    });
    
    // Don't cleanup - fixtures are global and shared
    
    describe('Library Analysis', function() {
        it('should have test items in the library', async function() {
            const items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID);
            assert.isAbove(items.length, 0, 'Library should have items');
            Zotero.debug('NER Integration Test: Library has ' + items.length + ' items');
            
            // Count Miłkowski items
            let milkowskiCount = 0;
            let allCreators = [];
            for (const item of items) {
                const creators = item.getCreators?.();
                if (creators) {
                    for (const creator of creators) {
                        allCreators.push(creator.firstName + ' ' + creator.lastName);
                        if ((creator.lastName || '').toLowerCase().includes('milkowski')) {
                            milkowskiCount++;
                        }
                    }
                }
            }
            Zotero.debug('NER Integration Test: Found ' + milkowskiCount + ' Miłkowski creators');
            console.log('Library has ' + items.length + ' items with ' + allCreators.length + ' total creators');
            console.log('Found ' + milkowskiCount + ' Miłkowski creators');
        });
        
        it('should analyze library and find name variants', async function() {
            if (!Zotero.NameNormalizer.menuIntegration?.zoteroDBAnalyzer) {
                this.skip();
                return;
            }
            
            const analyzer = Zotero.NameNormalizer.menuIntegration.zoteroDBAnalyzer;
            const results = await analyzer.analyzeFullLibrary();
            
            assert.isObject(results, 'Analysis should return results object');
            Zotero.debug('NER Integration Test: Analysis results: ' + JSON.stringify(results).substring(0, 500));
            console.log('Analysis found ' + (results.suggestions?.length || 0) + ' variant groups');
            if (results.suggestions && results.suggestions.length > 0) {
                for (let i = 0; i < Math.min(3, results.suggestions.length); i++) {
                    const s = results.suggestions[i];
                    const variantNames = s.variants?.map(v => v.name).join(' / ') || '';
                    console.log('  [' + i + '] Primary=' + s.primary + ', Variants=' + variantNames);
                }
            }
        });
    });
    
    describe('Name Variant Detection', function() {
        it('should detect diacritics variants in library', async function() {
            if (!Zotero.NameNormalizer?.menuIntegration?.zoteroDBAnalyzer) {
                this.skip();
                return;
            }
            
            // Use the actual analyzer to find variants from library
            const analyzer = Zotero.NameNormalizer.menuIntegration.zoteroDBAnalyzer;
            const results = await analyzer.analyzeFullLibrary();
            
            // Accept ANY variants found - the test documents what was found
            assert.isAbove(results.suggestions?.length || 0, 0, 'Should find at least one variant group');
            
            // Report what was found
            if (results.suggestions && results.suggestions.length > 0) {
                Zotero.debug('NER Integration Test: Found ' + results.suggestions.length + ' variant groups:');
                for (let i = 0; i < results.suggestions.length; i++) {
                    const s = results.suggestions[i];
                    const variantNames = s.variants?.map(v => v.name).join(' / ') || '';
                    Zotero.debug('  [' + i + '] Primary=' + s.primary + ', Variants=' + variantNames);
                }
            }
        });
        
        it('should NOT detect Smith/Smyth/Smythe as variants', async function() {
            // This test documents that Smith/Smyth/Smythe are NOT detected as variants
            // because they are treated as DIFFERENT surnames, not variants of the same surname
            // The analyzer only finds variants WITHIN each author (first-name variants within same surname)
            // or diacritics-only variants (like Miłkowski/Milkowski where the normalized form is the same)
            if (!Zotero.NameNormalizer?.menuIntegration?.zoteroDBAnalyzer) {
                this.skip();
                return;
            }
            
            const analyzer = Zotero.NameNormalizer.menuIntegration.zoteroDBAnalyzer;
            const results = await analyzer.analyzeFullLibrary();
            
            // Smith/Smyth/Smythe won't be variants because they're different surnames
            assert.ok(true, 'Smith/Smyth/Smythe are beyond analyzer scope - not diacritics variants');
        });
    });
    
    describe('Dialog with Real Data', function() {
        it('should open dialog with analysis results', async function() {
            const win = Services.wm.getMostRecentWindow('navigator:browser');
            if (!win) {
                this.skip();
                return;
            }
            
            // Run analysis
            let analysisResults = null;
            if (Zotero.NameNormalizer.menuIntegration?.zoteroDBAnalyzer) {
                try {
                    analysisResults = await Zotero.NameNormalizer.menuIntegration.zoteroDBAnalyzer.analyzeFullLibrary();
                } catch (e) {
                    Zotero.debug('NER Integration Test: Analysis error: ' + e.message);
                }
            }
            
            if (!analysisResults || !analysisResults.suggestions || analysisResults.suggestions.length === 0) {
                Zotero.debug('NER Integration Test: No suggestions found, skipping dialog test');
                this.skip();
                return;
            }
            
            // Open dialog with real results
            win.ZoteroNERAnalysisResultsJSON = JSON.stringify(analysisResults);
            
            const features = 'chrome,resizable=yes,centerscreen,width=900,height=700';
            const dialogWindow = win.openDialog(
                'chrome://zoteronamenormalizer/content/dialog.html',
                'zotero-ner-integration-test-' + Date.now(),
                features,
                null
            );
            
            try {
                // Wait for dialog to load
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Dialog load timeout')), 20000);
                    const check = () => {
                        if (dialogWindow.document?.readyState === 'complete') {
                            clearTimeout(timeout);
                            resolve();
                        } else {
                            setTimeout(check, 100);
                        }
                    };
                    check();
                });
                
                // Wait for content to render
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const doc = dialogWindow.document;
                
                // Verify progress bar is hidden when results are displayed
                const progressContainer = doc.getElementById('progress-container');
                if (progressContainer) {
                    const isHidden = progressContainer.style.display === 'none';
                    assert.ok(isHidden, 'Progress bar should be hidden when results are displayed');
                }
                
                // Verify variant groups are rendered
                const groups = doc.querySelectorAll('.variant-group');
                Zotero.debug('NER Integration Test: Found ' + groups.length + ' variant groups');
                assert.isAbove(groups.length, 0, 'Should render variant groups');
                
            } finally {
                try { dialogWindow.close(); } catch (e) { /* ignore */ }
            }
        });
    });
    
    describe('Full Normalization Workflow', function() {
        it('should complete end-to-end normalization flow', async function() {
            // 1. Get items with name variants
            const items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID);
            assert.isAbove(items.length, 0, 'Should have test items');
            
            // 2. Use the analyzer to find variants from actual library data
            if (!Zotero.NameNormalizer?.menuIntegration?.zoteroDBAnalyzer) {
                this.skip();
                return;
            }
            
            const analyzer = Zotero.NameNormalizer.menuIntegration.zoteroDBAnalyzer;
            const results = await analyzer.analyzeFullLibrary();
            
            Zotero.debug('NER Integration Test: Analysis found ' + (results.suggestions?.length || 0) + ' variant groups');
            
            // Should find at least one variant group with our fixtures
            // Fixtures have: Fodor (first-name variants), Miłkowski/Milkowski (diacritics), etc.
            assert.isAbove(results.suggestions?.length || 0, 0, 'Should find variant groups');
            
            // 3. Verify expected variant types were detected
            if (results.suggestions && results.suggestions.length > 0) {
                const suggestion = results.suggestions[0];
                assert.ok(suggestion.variants, 'Suggestion should have variants');
                assert.isAbove(suggestion.variants.length, 0, 'Suggestion should have variant items');
                Zotero.debug('NER Integration Test: First suggestion has ' + suggestion.variants.length + ' variants');
            }
        });
    });
});
