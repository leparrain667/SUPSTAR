const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');

function nullable(value) {
  return value === undefined || value === '' ? null : value;
}

function normalizeNumber(value) {
  if (value === undefined || value === '' || value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Valeur numérique invalide');
  return n;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).map((tag) => tag.slice(0, 50)))].slice(0, 20);
}

function isAllowedPhotoUrl(value) {
  return /^https?:\/\//i.test(value) || /^\/uploads\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(value);
}

async function syncTags(tx, placeId, tags) {
  const normalized = normalizeTags(tags);
  await tx.placeTag.deleteMany({ where: { placeId } });

  for (const name of normalized) {
    const tag = await tx.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await tx.placeTag.create({ data: { placeId, tagId: tag.id } });
  }
}

async function syncPhotos(tx, placeId, photos, uploadedBy) {
  if (!Array.isArray(photos)) return;
  const urls = [...new Set(photos.map((photo) => typeof photo === 'string' ? photo.trim() : '').filter((url) => isAllowedPhotoUrl(url) && url.length <= 500))].slice(0, 20);
  await tx.placePhoto.deleteMany({ where: { placeId } });
  if (urls.length) {
    await tx.placePhoto.createMany({
      data: urls.map((url) => ({ placeId, url, uploadedBy })),
    });
  }
}

async function createPlaceWithClient(tx, { listId, categoryId, name, address, city, country, description, openingHours, priceMin, priceMax, lat, lon, tags, photos, createdBy }) {
  const rows = await tx.$queryRaw`
      INSERT INTO places (
        list_id, category_id, name, address, city, country, description,
        opening_hours, price_min, price_max, location, created_by
      )
      VALUES (
        ${listId}::uuid, ${nullable(categoryId)}, ${name}, ${nullable(address)}, ${nullable(city)},
        ${nullable(country)}, ${nullable(description)}, ${openingHours == null ? null : JSON.stringify(openingHours)}::jsonb,
        ${normalizeNumber(priceMin)}, ${normalizeNumber(priceMax)},
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography, ${createdBy}::uuid
      )
      RETURNING id
    `;
  const placeId = rows[0].id;
  await syncTags(tx, placeId, tags);
  await syncPhotos(tx, placeId, photos, createdBy);
  return tx.place.findUnique({
    where: { id: placeId },
    include: { category: true, tags: { include: { tag: true } }, photos: true },
  });
}

async function createPlace(data) {
  const result = await prisma.$transaction(async (tx) => {
    return createPlaceWithClient(tx, data);
  }, { maxWait: 10000, timeout: 30000 });
  return result;
}

async function updatePlace(id, data) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.place.findUnique({ where: { id } });
    if (!existing) return null;
    const {
      categoryId, name, address, city, country, description, openingHours,
      priceMin, priceMax, lat, lon, tags, photos, updatedBy,
    } = data;

    const rows = await tx.$queryRaw`
      UPDATE places
      SET category_id = ${categoryId === undefined ? existing.categoryId : nullable(categoryId)},
          name = ${name === undefined ? existing.name : name},
          address = ${address === undefined ? existing.address : nullable(address)},
          city = ${city === undefined ? existing.city : nullable(city)},
          country = ${country === undefined ? existing.country : nullable(country)},
          description = ${description === undefined ? existing.description : nullable(description)},
          opening_hours = ${openingHours === undefined ? (existing.openingHours == null ? null : JSON.stringify(existing.openingHours)) : (openingHours == null ? null : JSON.stringify(openingHours))}::jsonb,
          price_min = ${priceMin === undefined ? existing.priceMin : normalizeNumber(priceMin)},
          price_max = ${priceMax === undefined ? existing.priceMax : normalizeNumber(priceMax)},
          location = CASE
            WHEN ${lat !== undefined && lon !== undefined}
              THEN ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
            ELSE location
          END,
          updated_at = now()
      WHERE id = ${id}::uuid
      RETURNING id
    `;

    if (!rows[0]) return null;
    if (tags !== undefined) await syncTags(tx, id, tags);
    await syncPhotos(tx, id, photos, updatedBy);

    return tx.place.findUnique({
      where: { id },
      include: {
        category: true,
        tags: { include: { tag: true } },
        photos: true,
        reviews: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
  }, { maxWait: 10000, timeout: 30000 });
}

async function findByList({ listId, categoryId, city, minRating, maxPrice, status, search, userId, limit = 500 }) {
  const filters = [Prisma.sql`p.list_id = ${listId}::uuid`];
  if (categoryId) filters.push(Prisma.sql`p.category_id = ${categoryId}`);
  if (city) filters.push(Prisma.sql`p.city ILIKE ${'%' + city + '%'}`);
  if (minRating !== undefined) filters.push(Prisma.sql`p.avg_rating >= ${minRating}`);
  if (maxPrice !== undefined) filters.push(Prisma.sql`p.price_min IS NOT NULL AND p.price_min <= ${maxPrice}`);
  if (status) filters.push(Prisma.sql`ups.status = ${status}`);
  if (search) filters.push(Prisma.sql`(
    p.search_vector @@ plainto_tsquery('french', ${search})
    OR p.name ILIKE ${'%' + search + '%'} OR p.city ILIKE ${'%' + search + '%'}
    OR EXISTS (SELECT 1 FROM place_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.place_id = p.id AND t.name ILIKE ${'%' + search + '%'})
  )`);
  return prisma.$queryRaw`
    SELECT p.id, p.list_id, p.name, p.address, p.city, p.country, p.description,
      p.opening_hours, p.category_id, c.name AS category_name, p.avg_rating, p.review_count,
      p.price_min, p.price_max, ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lon,
      ups.status AS user_status
    FROM places p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN user_place_status ups ON ups.place_id = p.id AND ups.user_id = ${userId}::uuid
    WHERE ${Prisma.join(filters, ' AND ')}
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `;
}

async function deletePlace(id) {
  await prisma.place.delete({ where: { id } });
}

async function getPlaceById(id, userId) {
  const place = await prisma.place.findUnique({
    where: { id },
    include: {
      category: true,
      tags: { include: { tag: true } },
      photos: true,
      reviews: {
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      },
      statuses: userId ? { where: { userId } } : false,
    },
  });

  if (!place) return null;
  const coords = await prisma.$queryRaw`
    SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon
    FROM places WHERE id = ${id}::uuid
  `;
  return {
    ...place,
    lat: coords[0]?.lat,
    lon: coords[0]?.lon,
    userStatus: place.statuses?.[0]?.status || null,
    statuses: undefined,
  };
}

// Recherche géo optimisée : lieux dans un rayon (mètres) autour d'un point.
async function findNearby({ lat, lon, radiusMeters = 5000, listId, categoryId, city, minRating, maxPrice, status, search, limit = 50, userId }) {
  const filters = [];
  // Never expose places from lists the requester cannot access, including
  // geographic searches that do not specify an explicit listId.
  if (userId) filters.push(Prisma.sql`AND EXISTS (
    SELECT 1 FROM list_members lm
    WHERE lm.list_id = p.list_id AND lm.user_id = ${userId}::uuid
  )`);
  if (listId) filters.push(Prisma.sql`AND p.list_id = ${listId}::uuid`);
  if (categoryId) filters.push(Prisma.sql`AND p.category_id = ${categoryId}`);
  if (city) filters.push(Prisma.sql`AND p.city ILIKE ${'%' + city + '%'}`);
  if (minRating !== undefined) filters.push(Prisma.sql`AND p.avg_rating >= ${minRating}`);
  if (maxPrice !== undefined) filters.push(Prisma.sql`AND p.price_min IS NOT NULL AND p.price_min <= ${maxPrice}`);
  if (search) filters.push(Prisma.sql`AND (p.search_vector @@ plainto_tsquery('french', ${search}) OR EXISTS (SELECT 1 FROM place_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.place_id = p.id AND t.name ILIKE ${'%' + search + '%'}))`);
  if (status && userId) filters.push(Prisma.sql`AND ups.status = ${status}`);

  const rows = await prisma.$queryRaw`
    SELECT p.id, p.list_id, p.name, p.address, p.city, p.country, p.description,
           p.category_id, c.name AS category_name, p.avg_rating, p.review_count,
           p.price_min, p.price_max,
           ST_Y(p.location::geometry) AS lat,
           ST_X(p.location::geometry) AS lon,
           ST_Distance(p.location, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography) AS distance_m,
           ups.status AS user_status
    FROM places p
    LEFT JOIN categories c ON c.id = p.category_id
    ${userId ? Prisma.sql`LEFT JOIN user_place_status ups ON ups.place_id = p.id AND ups.user_id = ${userId}::uuid` : Prisma.empty}
    WHERE ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography, ${radiusMeters})
    ${filters.length ? Prisma.join(filters, ' ') : Prisma.empty}
    ORDER BY distance_m ASC
    LIMIT ${limit}
  `;
  return rows;
}

module.exports = { createPlace, createPlaceWithClient, updatePlace, deletePlace, getPlaceById, findNearby, findByList };
