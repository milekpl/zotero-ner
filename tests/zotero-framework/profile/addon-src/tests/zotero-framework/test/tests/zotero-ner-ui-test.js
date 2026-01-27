/**
 * Zotero NER UI Test Suite (Zotero-native)
 *
 * Runs inside Zotero (chrome context). Opens the real normalization dialog and
 * asserts DOM/state without screenshots.
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

function makeDeterministicPayload() {
    // Keep structure aligned to what content/dialog.html expects:
    // `analysisResults.suggestions[]` with `type`, `primary`, `variants[]`.
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
    // dialog.html can read injected payloads from the opener.
    win.ZoteroNERAnalysisResultsJSON = JSON.stringify(payload);

    const features = 'chrome,modal,resizable=yes,centerscreen';

    const dialogWindow = win.openDialog(
        'chrome://zoteroner/content/dialog.html',
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
    Zotero.debug('NER UI Test: Starting Zotero-native UI test suite...');

    await Zotero.initializationPromise;

    // Ensure chrome URI exists (dialog load depends on it)
    assert(!!Services.io, 'Services.io is available');

    // Test 1: Dialog renders groups and recommended normalization
    try {
        const payload = makeDeterministicPayload();
        const dialog = await openDialogWithPayload(payload);

        const doc = dialog.document;
        const groupList = doc.getElementById('variant-groups-container');
        assert(!!groupList, 'Dialog: variant groups container exists');

        const groups = [...groupList.querySelectorAll('.variant-group')];
        assert(groups.length >= 1, 'Dialog: renders at least one variant group');

        const headerMeta = doc.querySelector('.variant-group-header .variant-meta');
        assert(!!headerMeta, 'Dialog: recommended meta exists');
        if (headerMeta) {
            const metaText = headerMeta.textContent || '';
            assert(metaText.includes('Recommended normalization'), 'Dialog: recommended meta text present');
            // Title-case recommendation should include "Milkowski"
            assert(metaText.includes('Milkowski'), 'Dialog: recommended normalization includes Milkowski', metaText);
        }

        // There should be a recommended pill
        const recommendedPill = doc.querySelector('.variant-pill.recommended');
        assert(!!recommendedPill, 'Dialog: recommended pill is marked');

        // Test 2: Clicking a pill reveals details panel
        const firstPill = doc.querySelector('.variant-pill');
        assert(!!firstPill, 'Dialog: at least one pill exists');

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
            assert(!!title, 'Dialog: detail title element exists');
            if (title) {
                assert((title.textContent || '').trim().length > 0, 'Dialog: detail title populated');
            }

            const items = doc.getElementById('variant-detail-items');
            assert(!!items, 'Dialog: detail items element exists');
            if (items) {
                // Deterministic payload includes at least one item for the recommended variant
                assert(items.querySelectorAll('li').length >= 1, 'Dialog: detail items populated');
            }
        }

        // Close dialog
        try { dialog.close(); } catch (e) {}
        pass('UI suite: dialog open/render/click');
    } catch (e) {
        fail('UI suite: dialog open/render/click', e.message || e);
    }

    return uiTestResults;
}

if (typeof globalThis !== 'undefined') {
    globalThis.ZoteroNERUITests = {
        runTests,
        getResults: () => uiTestResults,
    };
}
