const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeImportedPlace } = require('../src/controllers/transfer.controller');

test('import normalization accepts a complete valid place', () => {
  const place = normalizeImportedPlace({
    name: 'Musée test', lat: '48.8', lon: '2.3', priceMin: '5', priceMax: '20',
    rating: '4', status: 'visited', tags: 'culture|famille', photos: '',
  });
  assert.equal(place.priceMin, 5);
  assert.equal(place.rating, 4);
  assert.deepEqual(place.tags, ['culture', 'famille']);
});

test('import normalization rejects invalid business fields before writing', () => {
  const base = { name: 'Lieu test', lat: 48.8, lon: 2.3 };
  assert.throws(() => normalizeImportedPlace({ ...base, priceMin: 30, priceMax: 10 }), /prix/i);
  assert.throws(() => normalizeImportedPlace({ ...base, rating: 6 }), /note/i);
  assert.throws(() => normalizeImportedPlace({ ...base, status: 'secret' }), /statut/i);
});
