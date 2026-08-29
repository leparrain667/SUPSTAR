const prisma = require('../lib/prisma');
const placesService = require('../services/places.service');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { toCsv, parseCsv } = require('../utils/csv');

const isAllowedPhotoUrl = (value) => /^https?:\/\//i.test(value) || /^\/uploads\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(value);

const CSV_COLUMNS = [
  'name', 'address', 'city', 'country', 'category', 'description', 'openingHours',
  'priceMin', 'priceMax', 'lat', 'lon', 'tags', 'photos', 'status', 'rating', 'comment',
].map((key) => ({ key }));

async function buildExport(listId, userId) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { id: true, name: true, description: true, createdAt: true },
  });
  if (!list) throw new AppError('Liste non trouvée', 404);
  const places = await prisma.place.findMany({
    where: { listId },
    include: {
      category: true, photos: true, tags: { include: { tag: true } },
      statuses: { where: { userId } }, reviews: { where: { userId } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const coordinates = await prisma.$queryRawUnsafe(
    'SELECT id, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon FROM places WHERE list_id = $1::uuid', listId,
  );
  const coordsById = new Map(coordinates.map((item) => [item.id, item]));
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    list,
    places: places.map((place) => ({
      name: place.name, address: place.address, city: place.city, country: place.country,
      category: place.category?.name || '', description: place.description,
      openingHours: place.openingHours, priceMin: place.priceMin?.toString() || '', priceMax: place.priceMax?.toString() || '',
      lat: Number(coordsById.get(place.id)?.lat), lon: Number(coordsById.get(place.id)?.lon),
      tags: place.tags.map((item) => item.tag.name), photos: place.photos.map((photo) => photo.url),
      status: place.statuses[0]?.status || '', rating: place.reviews[0]?.rating || '', comment: place.reviews[0]?.comment || '',
    })),
  };
}

const exportList = asyncHandler(async (req, res) => {
  const data = await buildExport(req.params.listId, req.user.id);
  const format = String(req.query.format || 'json').toLowerCase();
  const safeName = data.list.name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'supstar';
  if (format === 'csv') {
    const rows = data.places.map((place) => ({ ...place, openingHours: place.openingHours || '', tags: place.tags.join('|'), photos: place.photos.join('|') }));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
    return res.send(toCsv(rows, CSV_COLUMNS));
  }
  if (format !== 'json') throw new AppError('Format d’export non pris en charge', 400);
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.json"`);
  return res.json(data);
});

function normalizeImportedPlace(raw) {
  let openingHours = raw.openingHours || null;
  if (typeof openingHours === 'string' && openingHours.trim()) {
    try { openingHours = JSON.parse(openingHours); } catch { throw new AppError(`Horaires JSON invalides pour « ${raw.name || 'lieu'} »`, 400); }
  }
  if (openingHours !== null && (typeof openingHours !== 'object' || Array.isArray(openingHours))) {
    throw new AppError(`Horaires invalides pour « ${raw.name || 'lieu'} »`, 400);
  }
  const tags = Array.isArray(raw.tags) ? raw.tags : String(raw.tags || '').split('|');
  const photos = Array.isArray(raw.photos) ? raw.photos : String(raw.photos || '').split('|');
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  const name = String(raw.name || '').trim();
  if (!name) throw new AppError('Chaque lieu importé doit avoir un nom', 400);
  if (name.length > 200) throw new AppError(`Nom trop long pour « ${name.slice(0, 40)}… »`, 400);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new AppError(`Coordonnées invalides pour « ${raw.name} »`, 400);
  }
  const priceMin = raw.priceMin === '' || raw.priceMin == null ? null : Number(raw.priceMin);
  const priceMax = raw.priceMax === '' || raw.priceMax == null ? null : Number(raw.priceMax);
  if ((priceMin !== null && (!Number.isFinite(priceMin) || priceMin < 0)) || (priceMax !== null && (!Number.isFinite(priceMax) || priceMax < 0))) {
    throw new AppError(`Prix invalide pour « ${name} »`, 400);
  }
  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    throw new AppError(`Fourchette de prix invalide pour « ${name} »`, 400);
  }
  const rating = raw.rating === '' || raw.rating == null ? null : Number(raw.rating);
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new AppError(`Note invalide pour « ${name} »`, 400);
  }
  const status = String(raw.status || '').trim();
  if (status && !['to_visit', 'visited', 'favorite'].includes(status)) {
    throw new AppError(`Statut invalide pour « ${name} »`, 400);
  }
  const comment = raw.comment == null ? null : String(raw.comment).trim();
  if (comment && comment.length > 2000) throw new AppError(`Commentaire trop long pour « ${name} »`, 400);
  const category = String(raw.category || '').trim();
  if (category.length > 50) throw new AppError(`Catégorie trop longue pour « ${name} »`, 400);
  const limits = { address: 300, city: 100, country: 100, description: 10000 };
  for (const [field, max] of Object.entries(limits)) {
    if (raw[field] != null && String(raw[field]).length > max) {
      throw new AppError(`${field} trop long pour « ${name} »`, 400);
    }
  }
  const normalizedTags = tags.map((x) => String(x).trim()).filter(Boolean);
  const normalizedPhotos = photos.map((x) => String(x).trim()).filter(Boolean);
  if (normalizedTags.length > 20 || normalizedTags.some((tag) => tag.length > 50)) {
    throw new AppError(`Tags invalides pour « ${name} »`, 400);
  }
  if (normalizedPhotos.length > 20 || normalizedPhotos.some((url) => !isAllowedPhotoUrl(url) || url.length > 500)) {
    throw new AppError(`Photos invalides pour « ${name} »`, 400);
  }
  return {
    ...raw, name, category, openingHours, priceMin, priceMax, rating, status, comment,
    tags: normalizedTags, photos: normalizedPhotos, lat, lon,
  };
}

const importList = asyncHandler(async (req, res) => {
  const format = String(req.body.format || 'json').toLowerCase();
  let rawPlaces;
  if (format === 'csv') rawPlaces = parseCsv(req.body.content);
  else if (format === 'json') {
    let parsed = req.body.data ?? req.body.content;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { throw new AppError('Fichier JSON invalide', 400); }
    }
    rawPlaces = Array.isArray(parsed) ? parsed : parsed?.places;
  } else throw new AppError('Format d’import non pris en charge', 400);
  if (!Array.isArray(rawPlaces) || !rawPlaces.length) throw new AppError('Le fichier ne contient aucun lieu', 400);
  if (rawPlaces.length > 500) throw new AppError('Un import est limité à 500 lieux', 400);
  const places = rawPlaces.map(normalizeImportedPlace);
  const imported = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const place of places) {
      let categoryId = null;
      if (place.category) {
        const category = await tx.category.upsert({
          where: { name: place.category }, update: {}, create: { name: place.category },
        });
        categoryId = category.id;
      }
      const created = await placesService.createPlaceWithClient(tx, {
        ...place, listId: req.params.listId, categoryId, createdBy: req.user.id,
      });
      if (place.status) {
        await tx.userPlaceStatus.create({
          data: { userId: req.user.id, placeId: created.id, status: place.status },
        });
      }
      if (place.rating !== null) {
        await tx.review.create({
          data: { userId: req.user.id, placeId: created.id, rating: place.rating, comment: place.comment },
        });
        await tx.place.update({
          where: { id: created.id }, data: { avgRating: place.rating, reviewCount: 1 },
        });
      }
      count += 1;
    }
    return count;
  }, { maxWait: 10000, timeout: 120000 });
  res.status(201).json({ imported });
});

module.exports = { exportList, importList, buildExport, normalizeImportedPlace };
