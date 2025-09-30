// Simple test script to understand the actual behavior of the NameParser
const NameParser = require('./src/core/name-parser.js');

const parser = new NameParser();

console.log('Testing empty string:');
console.log('Input: ""');
const result1 = parser.parse('');
console.log('Parts:', ''.trim().replace(/[,\\s]+$/, '').split(/\\s+/));
console.log('Result:', result1);

console.log('\nTesting null:');
console.log('Input: null');
const result2 = parser.parse(null);
console.log('Parts:', (null || '').trim().replace(/[,\\s]+$/, '').split(/\\s+/));
console.log('Result:', result2);

console.log('\nTesting undefined:');
console.log('Input: undefined');
const result3 = parser.parse(undefined);
console.log('Parts:', (undefined || '').trim().replace(/[,\\s]+$/, '').split(/\\s+/));
console.log('Result:', result3);

console.log('\nTesting normal name:');
console.log('Input: "John Smith"');
const result4 = parser.parse('John Smith');
console.log('Parts:', 'John Smith'.trim().replace(/[,\\s]+$/, '').split(/\s+/));
console.log('Result:', result4);

console.log('\nTesting multi-part name:');
console.log('Input: "Jerry Alan Fodor"');
const result5 = parser.parse('Jerry Alan Fodor');
console.log('Parts:', 'Jerry Alan Fodor'.trim().replace(/[,\\s]+$/, '').split(/\s+/));
console.log('Result:', result5);

console.log('\nTesting three-part name:');
console.log('Input: "John A. Smith"');
const result6 = parser.parse('John A. Smith');
console.log('Parts:', 'John A. Smith'.trim().replace(/[,\\s]+$/, '').split(/\s+/));
console.log('Result:', result6);

console.log('\nTesting prefix name:');
console.log('Input: "Eva van Dijk"');
console.log('Prefixes array:', parser.prefixes);
console.log('Does "van" exist in prefixes?', parser.prefixes.includes('van'));
console.log('Does "van" exist in prefixes (lowercase)?', parser.prefixes.includes('van'.toLowerCase()));
const result7 = parser.parse('Eva van Dijk');
console.log('Parts:', 'Eva van Dijk'.trim().replace(/[,\\s]+$/, '').split(/\s+/));
console.log('Result:', result7);

console.log('\nTesting multiple prefix name:');
console.log('Input: "Maria del Carmen Rodriguez"');
console.log('Does "del" exist in prefixes?', parser.prefixes.includes('del'));
const result8 = parser.parse('Maria del Carmen Rodriguez');
console.log('Parts:', 'Maria del Carmen Rodriguez'.trim().replace(/[,\\s]+$/, '').split(/\s+/));
console.log('Result:', result8);

console.log('\nTesting suffix name:');
console.log('Input: "John Smith Jr"');
const result9 = parser.parse('John Smith Jr');
console.log('Parts:', 'John Smith Jr'.trim().replace(/[,\\s]+$/, '').split(/\s+/));
console.log('Result:', result9);