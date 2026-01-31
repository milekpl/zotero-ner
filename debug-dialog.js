const { normalizeName } = require('./src/utils/string-distance.js');

global.Zotero = {
  debug: (msg) => console.log('DEBUG:', msg),
  logError: console.error
};

const ZoteroDBAnalyzer = require('./src/zotero/zotero-db-analyzer.js');

async function test() {
  const analyzer = new ZoteroDBAnalyzer();

  // Simulate the "and Friston" case
  const creators = [
    {
      firstName: 'Karl',
      lastName: 'and Friston',  // Malformed entry
      count: 1,
      parsedName: analyzer.parseName('Karl and Friston'),
      items: [
        { id: 1, title: 'Paper 1', authorFirstName: 'Karl', authorLastName: 'and Friston', author: 'Karl and Friston' }
      ]
    },
    {
      firstName: 'Karl',
      lastName: 'Friston',  // Correct entry
      count: 3,
      parsedName: analyzer.parseName('Karl Friston'),
      items: [
        { id: 2, title: 'Paper 2', authorFirstName: 'Karl', authorLastName: 'Friston', author: 'Karl Friston' },
        { id: 3, title: 'Paper 3', authorFirstName: 'Karl', authorLastName: 'Friston', author: 'Karl Friston' }
      ]
    }
  ];

  const result = await analyzer.analyzeCreators(creators);

  // Simulate JSON serialization (as done when passing to dialog)
  console.log('\n=== Simulating dialog behavior ===');
  const jsonString = JSON.stringify(result);
  const parsed = JSON.parse(jsonString);

  const suggestion = parsed.suggestions[0];

  // Simulate clicking on "and Friston" (which is variant index 1)
  const variantIndex = 1;
  const variant = suggestion.variants[variantIndex];

  console.log('Clicked variant:', variant.name);
  console.log('variant.items:', JSON.stringify(variant.items, null, 2));

  // Simulate what showVariantDetails does
  const items = Array.isArray(variant.items) ? variant.items : [];
  console.log('Final items array:', items.length);

  if (items.length === 0) {
    console.log('Would show: No sample items available for this variant.');
  } else {
    for (const item of items) {
      const title = item.title || 'Untitled';
      const author = item.author || '';
      console.log(`  - ${author} — ${title}`);
    }
  }

  // Now try variant index 0 (Friston)
  console.log('\n=== Now checking variant index 0 (Friston) ===');
  const variant0 = suggestion.variants[0];
  console.log('variant0.items:', JSON.stringify(variant0.items, null, 2));
}

test().catch(console.error);
