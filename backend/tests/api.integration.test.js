require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

let server;
let baseUrl;
let email;
let secondEmail;
let token;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await response.json() : await response.text();
  return { response, data };
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  email = `integration-${Date.now()}@supstar.test`;
});

test.after(async () => {
  for (const candidate of [email, secondEmail]) {
    if (candidate) {
      const user = await prisma.user.findUnique({ where: { email: candidate }, select: { id: true } });
      if (user) {
        await prisma.list.deleteMany({ where: { ownerId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    }
  }
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
});

test('complete authenticated workflow', async () => {
  const registered = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password: 'ValidPassword!42', displayName: 'Integration Test' }) });
  assert.equal(registered.response.status, 201, JSON.stringify(registered.data));
  token = registered.data.token;

  const personalLists = await request('/lists');
  assert.equal(personalLists.response.status, 200);
  assert.equal(personalLists.data.lists.length, 1);
  assert.equal(personalLists.data.lists[0].isPersonal, true);

  const createdList = await request('/lists', { method: 'POST', body: JSON.stringify({ name: 'Voyage test', description: 'Liste intégration' }) });
  assert.equal(createdList.response.status, 201);
  const listId = createdList.data.list.id;

  const categories = await request('/places/categories');
  assert.equal(categories.response.status, 200);
  const categoryId = categories.data.categories[0].id;
  const createdPlace = await request('/places', { method: 'POST', body: JSON.stringify({ listId, categoryId, name: 'Musée test', address: '1 rue Test', city: 'Paris', country: 'France', description: 'Description', priceMin: 5, priceMax: 15, lat: 48.8566, lon: 2.3522, tags: ['culture'], photos: ['https://example.com/photo.jpg'] }) });
  assert.equal(createdPlace.response.status, 201, JSON.stringify(createdPlace.data));
  const placeId = createdPlace.data.place.id;

  secondEmail = `integration-private-${Date.now()}@supstar.test`;
  const secondRegistered = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: secondEmail, password: 'ValidPassword!42', displayName: 'Private User' }),
  });
  assert.equal(secondRegistered.response.status, 201, JSON.stringify(secondRegistered.data));
  const secondToken = secondRegistered.data.token;
  const secondList = await request('/lists', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ name: 'Private list' }),
  });
  const privatePlace = await request('/places', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ listId: secondList.data.list.id, name: 'Secret place', lat: 48.8566, lon: 2.3522 }),
  });
  assert.equal(privatePlace.response.status, 201, JSON.stringify(privatePlace.data));

  const nearby = await request('/places/nearby?lat=48.8566&lon=2.3522&radius=1000');
  assert.equal(nearby.response.status, 200, JSON.stringify(nearby.data));
  assert.equal(nearby.data.places.some((place) => place.id === privatePlace.data.place.id), false);
  assert.equal(nearby.data.places.some((place) => place.id === placeId), true);

  const invalidFilter = await request(`/lists/${listId}/search?minRating=not-a-number`);
  assert.equal(invalidFilter.response.status, 400);

  const invitedReader = await request(`/lists/${listId}/members`, {
    method: 'POST', body: JSON.stringify({ email: secondEmail, role: 'reader' }),
  });
  assert.equal(invitedReader.response.status, 201, JSON.stringify(invitedReader.data));
  const readerCanRead = await request(`/places/${placeId}`, {
    headers: { Authorization: `Bearer ${secondToken}` },
  });
  assert.equal(readerCanRead.response.status, 200);
  const readerCannotCreatePlace = await request('/places', {
    method: 'POST', headers: { Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ listId, name: 'Forbidden place', lat: 48.8, lon: 2.3 }),
  });
  assert.equal(readerCannotCreatePlace.response.status, 403);
  const readerCannotReview = await request(`/places/${placeId}/reviews`, {
    method: 'POST', headers: { Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ rating: 3, comment: 'Forbidden' }),
  });
  assert.equal(readerCannotReview.response.status, 403);

  const review = await request(`/places/${placeId}/reviews`, { method: 'POST', body: JSON.stringify({ rating: 5, comment: 'Excellent' }) });
  assert.equal(review.response.status, 201, JSON.stringify(review.data));
  const promoted = await request(`/lists/${listId}/members/${secondRegistered.data.user.id}`, {
    method: 'PUT', body: JSON.stringify({ role: 'commentator' }),
  });
  assert.equal(promoted.response.status, 200, JSON.stringify(promoted.data));
  const commentatorCannotEditAnotherReview = await request(`/places/${placeId}/reviews/${review.data.review.id}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ rating: 1, comment: 'Tampered' }),
  });
  assert.equal(commentatorCannotEditAnotherReview.response.status, 403);
  const commentatorReview = await request(`/places/${placeId}/reviews`, {
    method: 'POST', headers: { Authorization: `Bearer ${secondToken}` },
    body: JSON.stringify({ rating: 4, comment: 'Allowed' }),
  });
  assert.equal(commentatorReview.response.status, 201, JSON.stringify(commentatorReview.data));
  const status = await request(`/places/${placeId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'favorite' }) });
  assert.equal(status.response.status, 200);

  const search = await request(`/lists/${listId}/search?q=Musée&minRating=4`);
  assert.equal(search.response.status, 200, JSON.stringify(search.data));
  assert.equal(search.data.places.length, 1);

  const exported = await request(`/lists/${listId}/export?format=json`);
  assert.equal(exported.response.status, 200, JSON.stringify(exported.data));
  assert.equal(exported.data.places[0].name, 'Musée test');

  const imported = await request(`/lists/${listId}/import`, { method: 'POST', body: JSON.stringify({ format: 'json', data: { places: [{ name: 'Lieu importé', city: 'Lyon', country: 'France', lat: 45.764, lon: 4.8357, tags: ['test'] }] } }) });
  assert.equal(imported.response.status, 201, JSON.stringify(imported.data));
  assert.equal(imported.data.imported, 1);

  const beforeRejectedImport = await request(`/lists/${listId}/search`);
  const rejectedImport = await request(`/lists/${listId}/import`, {
    method: 'POST',
    body: JSON.stringify({ format: 'json', data: { places: [
      { name: 'Should not persist', lat: 45.75, lon: 4.84 },
      { name: 'Invalid second row', lat: 45.76, lon: 4.85, priceMin: 50, priceMax: 10 },
    ] } }),
  });
  assert.equal(rejectedImport.response.status, 400);
  const afterRejectedImport = await request(`/lists/${listId}/search`);
  assert.equal(afterRejectedImport.data.places.length, beforeRejectedImport.data.places.length);
  assert.equal(afterRejectedImport.data.places.some((place) => place.name === 'Should not persist'), false);

  const profile = await request('/users/me/profile', { method: 'PUT', body: JSON.stringify({ displayName: 'Test Updated', avatarUrl: '' }) });
  assert.equal(profile.response.status, 200);
  const preferences = await request('/users/me/preferences', { method: 'PUT', body: JSON.stringify({ preferredCategories: ['Musée'], preferredLanguages: ['fr'], budgetRange: '€€', notificationSettings: { enabled: true } }) });
  assert.equal(preferences.response.status, 200);
});
