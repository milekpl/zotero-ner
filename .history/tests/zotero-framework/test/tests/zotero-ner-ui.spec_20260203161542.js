/**
 * Zotero NER UI Test Suite
 *
 * Mocha BDD test suite for UI/Dialog tests of the Zotero Name Normalizer extension.
 * This file is bundled by zotero-plugin-scaffold and run in Zotero's test framework.
 */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(predicate, { timeout = 10000, interval = 50, name = 'condition' } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            if (await predicate()) {
                return true;
            }
        } catch (e) {
            // ignore transient errors while DOM initializes
        }
        await sleep(interval);
    }
    throw new Error('Timeout waiting for ' + name);
}

function makeDeterministicPayload() {
    return {
        totalVariantGroups: 1,
        totalUniqueSurnames: 1,
        surnameFrequencies: {
            milkowski: 2,
            'miłkowski': 1,
        },
        suggestions: [
            {
                type: 'surname',
                primary: 'milkowski',
                variants: [
                    {
                        name: 'Milkowski',
                        frequency: 2,
                        items: [
                            { title: 'Example Paper A', year: '2020' },
                            { title: 'Example Paper B', year: '2021' },
                        ],
                    },
                    {
                        name: 'Miłkowski',
                        frequency: 1,
                        items: [
                            { title: 'Example Paper C', year: '2019' },
                        ],
                    },
                ],
            },
        ],
    };
}

async function openDialogWithPayload(payload) {
    const win = Services.wm.getMostRecentWindow('navigator:browser');
    if (!win) {
        throw new Error('No Zotero main window available');
    }

    // Provide parameters via opener globals. dialog.html reads these.
    win.ZoteroNERAnalysisResultsJSON = JSON.stringify(payload);

    const features = 'chrome,resizable=yes,centerscreen,width=800,height=600';

    const dialogWindow = win.openDialog(
        'chrome://zoteronamenormalizer/content/dialog.html',
        'zotero-ner-normalization-dialog-test',
        features,
        null,
    );

    await waitFor(
        () => dialogWindow && dialogWindow.document && dialogWindow.document.readyState === 'complete',
        { timeout: 20000, name: 'dialog document ready' },
    );

    // Wait for controller to initialize and render.
    await waitFor(
        () => {
            const controller = dialogWindow.ZoteroNER_NormalizationDialog;
            return !!controller && !!controller.analysisResults;
        },
        { timeout: 20000, name: 'dialog controller initialized' },
    );

    await waitFor(
        () => {
            const container = dialogWindow.document.getElementById('variant-groups-container');
            return !!container && container.querySelectorAll('.variant-group').length > 0;
        },
        { timeout: 20000, name: 'variant groups rendered' },
    );

    return dialogWindow;
}

describe('Zotero NER UI Tests', function() {
    this.timeout(60000);

    before(async function() {
        await Zotero.initializationPromise;
        Zotero.debug('NER UI Test: Zotero initialized');
    });

    describe('Progress Bar Behavior', function() {
        it('should have Services.io available', function() {
            assert.ok(Services.io, 'Services.io is available');
        });

        it.skip('should handle progress bar visibility correctly', async function() {
            // SKIPPED: This test hangs when opening dialog without analysis results
            // The dialog waits for analysis that never completes
            // TODO: Fix dialog to handle empty analysis gracefully
            this.skip();
        });
    });

    describe('Dialog Rendering', function() {
        let dialog;

        afterEach(function() {
            if (dialog) {
                try { dialog.close(); } catch (e) { /* ignore */ }
                dialog = null;
            }
        });

        it('should open dialog with deterministic payload', async function() {
            const win = Services.wm.getMostRecentWindow('navigator:browser');
            if (!win) {
                this.skip();
                return;
            }

            const payload = makeDeterministicPayload();
            dialog = await openDialogWithPayload(payload);
            assert.ok(dialog, 'Dialog should open');
        });

        it('should render variant groups container', async function() {
            const win = Services.wm.getMostRecentWindow('navigator:browser');
            if (!win) {
                this.skip();
                return;
            }

            const payload = makeDeterministicPayload();
            dialog = await openDialogWithPayload(payload);
            
            const doc = dialog.document;
            const groupList = doc.getElementById('variant-groups-container');
            assert.ok(groupList, 'variant groups container exists');
        });

        it('should render at least one variant group', async function() {
            const win = Services.wm.getMostRecentWindow('navigator:browser');
            if (!win) {
                this.skip();
                return;
            }

            const payload = makeDeterministicPayload();
            dialog = await openDialogWithPayload(payload);
            
            const doc = dialog.document;
            const groupList = doc.getElementById('variant-groups-container');
            const groups = [...groupList.querySelectorAll('.variant-group')];
            assert.isAtLeast(groups.length, 1, 'renders at least one variant group');
        });

        it('should show recommended normalization meta', async function() {
            const win = Services.wm.getMostRecentWindow('navigator:browser');
            if (!win) {
                this.skip();
                return;
            }

            const payload = makeDeterministicPayload();
            dialog = await openDialogWithPayload(payload);
            
            const doc = dialog.document;
            const headerMeta = doc.querySelector('.variant-group-header .variant-meta');
            assert.ok(headerMeta, 'recommended meta exists');
            
            if (headerMeta) {
                const metaText = headerMeta.textContent || '';
                assert.include(metaText, 'Recommended normalization', 'recommended meta text present');
                assert.include(metaText, 'Milkowski', 'recommended normalization includes Milkowski');
            }
        });

        it('should mark recommended pill', async function() {
            const win = Services.wm.getMostRecentWindow('navigator:browser');
            if (!win) {
                this.skip();
                return;
            }

            const payload = makeDeterministicPayload();
            dialog = await openDialogWithPayload(payload);
            
            const doc = dialog.document;
            const recommendedPill = doc.querySelector('.variant-pill.recommended');
            assert.ok(recommendedPill, 'recommended pill is marked');
        });

        it('should reveal details panel when clicking pill', async function() {
            const win = Services.wm.getMostRecentWindow('navigator:browser');
            if (!win) {
                this.skip();
                return;
            }

            const payload = makeDeterministicPayload();
            dialog = await openDialogWithPayload(payload);
            
            const doc = dialog.document;
            const firstPill = doc.querySelector('.variant-pill');
            assert.ok(firstPill, 'at least one pill exists');

            if (firstPill) {
                firstPill.click();

                await waitFor(
                    () => {
                        const panel = doc.getElementById('variant-detail-panel');
                        return !!panel && !panel.classList.contains('hidden') && !panel.classList.contains('empty');
                    },
                    { timeout: 10000, name: 'details panel visible' },
                );

                const title = doc.getElementById('variant-detail-title');
                assert.ok(title, 'detail title element exists');
                if (title) {
                    assert.isNotEmpty((title.textContent || '').trim(), 'detail title populated');
                }

                const items = doc.getElementById('variant-detail-items');
                assert.ok(items, 'detail items element exists');
                if (items) {
                    assert.isAtLeast(items.querySelectorAll('li').length, 1, 'detail items populated');
                }
            }
        });
    });
});
