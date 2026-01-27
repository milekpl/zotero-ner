/**
 * Setup Test Profile Script
 *
 * This script sets up the Zotero test profile with the extension
 * by creating the necessary symlinks and configuration.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TEST_PROFILE_DIR = path.join(__dirname, 'profile');
const EXTENSIONS_DIR = path.join(TEST_PROFILE_DIR, 'extensions');
const EXTENSION_ID = 'zotero-ner-author-normalizer@marcinmilkowski.pl';
const EXTENSION_PATH = path.join(EXTENSIONS_DIR, EXTENSION_ID);

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

function setupProfile() {
    log('Setting up test profile...');
    log(`Profile directory: ${TEST_PROFILE_DIR}`);

    // Create extensions directory if it doesn't exist
    if (!fs.existsSync(EXTENSIONS_DIR)) {
        fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
        log('Created extensions directory');
    }

    // Create extension directory
    if (!fs.existsSync(EXTENSION_PATH)) {
        fs.mkdirSync(EXTENSION_PATH, { recursive: true });
        log(`Created extension directory: ${EXTENSION_PATH}`);
    }

    // Files to symlink/copy to the extension directory
    const filesToLink = [
        'bootstrap.js',
        'manifest.json',
        'content',
        '_locales',
        'update.json'
    ];

    for (const file of filesToLink) {
        const src = path.join(PROJECT_ROOT, file);
        const dest = path.join(EXTENSION_PATH, file);

        // Remove existing if exists (handle symlinks properly)
        try {
            const lstat = fs.lstatSync(dest);
            if (lstat.isSymbolicLink() || lstat.isFile()) {
                fs.unlinkSync(dest);
            } else if (lstat.isDirectory()) {
                fs.rmSync(dest, { recursive: true, force: true });
            }
        } catch (e) {
            // File doesn't exist, that's fine
        }

        // Create symlink
        try {
            fs.symlinkSync(src, dest);
            log(`Linked: ${file}`);
        } catch (e) {
            // Fallback to copy if symlink fails
            if (e.code === 'EPERM' || e.code === 'EEXIST') {
                log(`Symlink failed for ${file}, copying instead...`);
                copyRecursive(src, dest);
                log(`Copied: ${file}`);
            } else {
                log(`Warning: Could not link ${file}: ${e.message}`);
            }
        }
    }

    // Update extensions.ini
    const extensionsIniPath = path.join(TEST_PROFILE_DIR, 'extensions.ini');
    let extensionsIni = fs.readFileSync(extensionsIniPath, 'utf8');
    extensionsIni = extensionsIni.replace(
        /Extension0=.*/,
        `Extension0=${EXTENSION_PATH}`
    );
    fs.writeFileSync(extensionsIniPath, extensionsIni);
    log('Updated extensions.ini');

    // Update extensions.json
    const extensionsJsonPath = path.join(TEST_PROFILE_DIR, 'extensions.json');
    const uuid = '4226d01d-6909-4d04-a4fb-3708442ab2c7';
    const extensionsJson = {
        schemaVersion: 37,
        addons: [{
            id: EXTENSION_ID,
            syncGUID: '{' + uuid + '}',
            location: 'app-profile',
            version: '1.0.0',
            type: 'extension',
            internalName: null,
            updateURL: null,
            updateKey: null,
            optionsURL: null,
            optionsType: null,
            aboutURL: null,
            iconURL: null,
            icon64URL: null,
            defaultLocale: {
                name: 'Zotero NER Author Name Normalizer',
                description: 'NER-based author name normalization for Zotero',
                creator: 'Marcin Milkowski',
                homepageURL: 'https://github.com/marcinmilkowski/zotero-ner'
            },
            visible: true,
            active: true,
            userDisabled: false,
            appDisabled: false,
            pendingUninstall: false,
            installedFromAddonsManager: true,
            responsibilities: null,
            responsibilitiesIndexed: null,
            seeing: true,
            targetApplications: [{
                id: 'zotero',
                minVersion: '6.999',
                maxVersion: '8.*',
                exists: true
            }],
            targetPlatforms: [],
            mulet: false,
            languages: {},
            converter: false,
            signer: null,
            hasBinaryComponents: false,
            requiresDependencies: false,
            dependencies: [],
            hasEmbeddedWebExtension: false
        }]
    };
    fs.writeFileSync(extensionsJsonPath, JSON.stringify(extensionsJson, null, 2));
    log('Updated extensions.json');

    log('Test profile setup complete!');
}

function copyRecursive(src, dest) {
    if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        for (const child of fs.readdirSync(src)) {
            copyRecursive(path.join(src, child), path.join(dest, child));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

setupProfile();
