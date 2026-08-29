import test from 'node:test';
import assert from 'node:assert/strict';
import { getApiError } from '../src/utils/errors.js';
import { normalizePlaceCoordinates } from '../src/utils/coordinates.js';

test('getApiError reads the stable API error shape', () => {
  const error = { response: { data: { error: { message: 'Accès interdit' } } } };
  assert.equal(getApiError(error, 'Fallback'), 'Accès interdit');
  assert.equal(getApiError({}, 'Fallback'), 'Fallback');
});

test('coordinate normalization supports API aliases and rejects invalid ranges', () => {
  assert.deepEqual(normalizePlaceCoordinates({ id: '1', latitude: '48.8', lng: '2.3' }), {
    id: '1', latitude: '48.8', lng: '2.3', lat: 48.8, lon: 2.3,
  });
  assert.equal(normalizePlaceCoordinates({ lat: 91, lon: 2 }), null);
  assert.equal(normalizePlaceCoordinates({ lat: 'invalid', lon: 2 }), null);
});
