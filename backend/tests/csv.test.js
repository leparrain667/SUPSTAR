const test = require('node:test');
const assert = require('node:assert/strict');
const { toCsv, parseCsv } = require('../src/utils/csv');

test('CSV round-trip preserves commas, quotes and line breaks', () => {
  const source = [{ name: 'Café "Supstar", Paris', description: 'Ligne 1\nLigne 2', tags: 'brunch|terrasse' }];
  const csv = toCsv(source, ['name', 'description', 'tags'].map((key) => ({ key })));
  assert.deepEqual(parseCsv(csv), source);
});

test('CSV parser rejects an unclosed quoted field', () => {
  assert.throws(() => parseCsv('name,city\n"Lieu,Paris'), /guillemet non fermé/);
});
