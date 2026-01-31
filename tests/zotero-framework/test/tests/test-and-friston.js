/**
 * Zotero NER UI Test - Malformed Surname Test
 *
 * Reproduces the "and Friston" issue where clicking on a malformed
 * surname variant shows no items in the right-hand side panel.
 */

const uiTestResults = {
    passed: 0,
    failed: 0,
    tests: [],
    timestamp: Date.now(),
};

function pass(name, details = {}) {
    uiTestResults.passed++;
    uiTestResults.tests.push({ name, status: 'pass', ...details });
    Zotero.debug('  [PASS] ' + name);
}

function fail(name, error, details = {}) {
    uiTestResults.failed++;
    uiTestResults.tests.push({ name, status: 'fail', error: String(error), ...details });
    Zotero.debug('  [FAIL] ' + name + ': ' + error);
}

function assert(condition, name, error, details = {}) {
    if (condition) {
        pass(name, details);
    } else {
        fail(name, error || 'assertion failed', details);
    }
}

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

function makeMalformedSurnamePayload() {
    // Simulates: "Karl and Friston" (malformed) vs "Karl Friston" (correct)
    return {
        totalVariantGroups: 1,
        totalUniqueSurnames: 1,
        surnameFrequencies: {
            'and friston': 1,
            'friston': 3,
        },
        suggestions: [
            {
                type: 'surname',
                primary: 'Friston',
                surnameKey: 'friston',
                variants: [
                    {
                        name: 'Friston',
                        frequency: 3,
                        items: [
                            { id: 2, title: 'Paper 2', author: 'Karl Friston', year: '2020' },
                            { id: 3, title: 'Paper 3', author: 'Karl Friston', year: '2021' },
                            { id: 4, title: 'Paper 4', author: 'Karl Friston', year: '2022' },
                        ],
                    },
                    {
                        name: 'and Friston',
                        frequency: 1,
                        items: [
                            { id: 1, title: 'Paper 1', author: 'Karl and Friston', year: '2019' },
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

    const features = 'chrome,modal,resizable=yes,centerscreen';

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

async function runTests() {
    Zotero.debug('NER UI Test: Starting malformed surname test...');

    await Zotero.initializationPromise;

    // Test: Malformed surname "and Friston" should show items when clicked
    try {
        const payload = makeMalformedSurnamePayload();
        const dialog = await openDialogWithPayload(payload);
        const doc = dialog.document;

        // Find the variant pills
        const pills = doc.querySelectorAll('.variant-pill');
        Zotero.debug('NER UI Test: Found ' + pills.length + ' variant pills');

        // Find the "and Friston" pill (should be the second one)
        let andFristonPill = null;
        let fristonPill = null;

        for (const pill of pills) {
            const text = pill.textContent || '';
            Zotero.debug('NER UI Test: Pill text: "' + text + '"');
            if (text.includes('and Friston')) {
                andFristonPill = pill;
            }
            if (text.includes('Friston') && !text.includes('and')) {
                fristonPill = pill;
            }
        }

        // Test: Verify both pills exist
        assert(!!andFristonPill, 'Dialog: "and Friston" pill exists');
        assert(!!fristonPill, 'Dialog: "Friston" pill exists');

        // Click on "and Friston"
        Zotero.debug('NER UI Test: Clicking on "and Friston" pill...');
        andFristonPill.click();

        // Wait for detail panel to update
        await sleep(500);

        // Check the detail panel
        const detailItems = doc.getElementById('variant-detail-items');
        assert(!!detailItems, 'Dialog: variant-detail-items element exists');

        const listItems = detailItems.querySelectorAll('li');
        Zotero.debug('NER UI Test: Found ' + listItems.length + ' items in detail panel');

        // Filter out the "and X more" meta item
        const realItems = Array.from(listItems).filter(li => !li.className || !li.className.includes('meta'));
        Zotero.debug('NER UI Test: Found ' + realItems.length + ' real items (excluding meta)');

        // The key assertion: "and Friston" should have 1 item
        assert(realItems.length === 1, 'Dialog: "and Friston" shows exactly 1 item', {
            expected: 1,
            actual: realItems.length,
            html: detailItems.innerHTML,
        });

        // Check the item content
        if (realItems.length > 0) {
            const itemContent = realItems[0].textContent || '';
            Zotero.debug('NER UI Test: Item content: "' + itemContent + '"');
            assert(itemContent.includes('Karl and Friston'), 'Dialog: Item shows correct author');
            assert(itemContent.includes('Paper 1'), 'Dialog: Item shows correct title');
        }

        // Now test clicking on "Friston" - should show 3 items
        Zotero.debug('NER UI Test: Clicking on "Friston" pill...');
        fristonPill.click();
        await sleep(500);

        const fristonDetailItems = doc.getElementById('variant-detail-items');
        const fristonListItems = fristonDetailItems.querySelectorAll('li');
        const fristonRealItems = Array.from(fristonListItems).filter(li => !li.className || !li.className.includes('meta'));

        assert(fristonRealItems.length === 3, 'Dialog: "Friston" shows exactly 3 items', {
            expected: 3,
            actual: fristonRealItems.length,
        });

        Zotero.debug('NER UI Test: "Friston" items content:');
        for (const item of fristonRealItems) {
            Zotero.debug('  - ' + item.textContent);
        }

        // Close the dialog
        dialogWindow.close();

    } catch (error) {
        fail('Test execution', error);
    }

    // Summary
    Zotero.debug('');
    Zotero.debug('NER UI Test Results: ' + uiTestResults.passed + ' passed, ' + uiTestResults.failed + ' failed');
    Zotero.debug('');

    return uiTestResults;
}

// Run the tests
runTests().catch(e => {
    Zotero.debug('NER UI Test: Fatal error: ' + e);
    Zotero.debug(e.stack);
});
