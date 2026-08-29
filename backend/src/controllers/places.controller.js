const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const placesService = require('../services/places.service');
const { optionalNumber, optionalStatus } = require('../utils/queryValidation');

const isAllowedPhotoUrl = (value) => /^https?:\/\//i.test(value) || /^\/uploads\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(value);

function validateCoordinates(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new AppError('Latitude invalide', 400);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new AppError('Longitude invalide', 400);
  return { latitude, longitude };
}

function validatePayload(body, { partial = false } = {}) {
  const { name, priceMin, priceMax } = body;
  if (!partial && !name?.trim()) throw new AppError('Le nom est requis', 400);
  if (partial && name !== undefined && !name.trim()) throw new AppError('Le nom ne peut pas être vide', 400);
  if (priceMin !== undefined && priceMin !== '' && Number(priceMin) < 0) throw new AppError('Prix minimum invalide', 400);
  if (priceMax !== undefined && priceMax !== '' && Number(priceMax) < 0) throw new AppError('Prix maximum invalide', 400);
  if (priceMin !== undefined && priceMax !== undefined && priceMin !== '' && priceMax !== '' && Number(priceMin) > Number(priceMax)) {
    throw new AppError('Le prix minimum ne peut pas dépasser le prix maximum', 400);
  }
  const limits = { name: 200, address: 300, city: 100, country: 100 };
  for (const [field, max] of Object.entries(limits)) {
    if (body[field] !== undefined && String(body[field]).length > max) throw new AppError(`${field} dépasse ${max} caractères`, 400);
  }
  if (body.description !== undefined && String(body.description).length > 10000) throw new AppError('Description trop longue', 400);
  if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== '' && !Number.isInteger(Number(body.categoryId))) throw new AppError('Catégorie invalide', 400);
  if (body.tags !== undefined && !Array.isArray(body.tags)) throw new AppError('tags doit être un tableau', 400);
  if (body.photos !== undefined && !Array.isArray(body.photos)) throw new AppError('photos doit être un tableau', 400);
  if (Array.isArray(body.tags) && (body.tags.length > 20 || body.tags.some((tag) => String(tag).trim().length > 50))) {
    throw new AppError('Un lieu accepte au maximum 20 tags de 50 caractères', 400);
  }
  if (Array.isArray(body.photos) && (body.photos.length > 20 || body.photos.some((url) => !isAllowedPhotoUrl(String(url).trim()) || String(url).trim().length > 500))) {
    throw new AppError('Les photos doivent être au maximum 20 URL HTTP(S) valides', 400);
  }
  if (body.openingHours !== undefined && body.openingHours !== null && (typeof body.openingHours !== 'object' || Array.isArray(body.openingHours))) {
    throw new AppError('Les horaires doivent être un objet JSON', 400);
  }
}

const listCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json({ categories });
});

const createPlace = asyncHandler(async (req, res) => {
  validatePayload(req.body);
  const { listId, categoryId, name, address, city, country, description, openingHours, priceMin, priceMax, lat, lon, tags, photos } = req.body;
  if (!listId) throw new AppError('listId est requis', 400);
  if (lat === undefined || lon === undefined) throw new AppError('Latitude et longitude sont requises', 400);
  const coords = validateCoordinates(lat, lon);

  const place = await placesService.createPlace({
    listId, categoryId: categoryId ? Number(categoryId) : null, name: name.trim(), address, city, country,
    description, openingHours, priceMin, priceMax, lat: coords.latitude, lon: coords.longitude, tags, photos,
    createdBy: req.user.id,
  });

  res.status(201).json({ place });
});

const getNearbyPlaces = asyncHandler(async (req, res) => {
  const { lat, lon, radius, listId, category, city, minRating, maxPrice, status, search } = req.query;
  if (!lat || !lon) throw new AppError('lat et lon sont requis', 400);
  const coords = validateCoordinates(lat, lon);
  const parsedStatus = optionalStatus(status);

  if (listId) {
    const membership = await prisma.listMember.findUnique({ where: { listId_userId: { listId, userId: req.user.id } } });
    if (!membership) throw new AppError('Accès interdit à cette liste', 403);
  }

  const places = await placesService.findNearby({
    lat: coords.latitude, lon: coords.longitude,
    radiusMeters: optionalNumber(radius, 'Rayon', { integer: true, min: 100, max: 100000 }) ?? 5000,
    listId,
    categoryId: optionalNumber(category, 'Catégorie', { integer: true, min: 1 }),
    city, minRating: optionalNumber(minRating, 'Note minimale', { min: 0, max: 5 }),
    maxPrice: optionalNumber(maxPrice, 'Prix maximum', { min: 0 }),
    status: parsedStatus, search, userId: req.user.id,
  });
  res.json({ places });
});

const getPlaceById = asyncHandler(async (req, res) => {
  const place = await placesService.getPlaceById(req.params.id, req.user?.id);
  if (!place) throw new AppError('Lieu non trouvé', 404);
  const membership = await prisma.listMember.findUnique({ where: { listId_userId: { listId: place.listId, userId: req.user.id } } });
  if (!membership) throw new AppError('Accès interdit à ce lieu', 403);
  res.json({ place });
});

const updatePlace = asyncHandler(async (req, res) => {
  validatePayload(req.body, { partial: true });
  const current = await prisma.place.findUnique({ where: { id: req.params.id }, select: { id: true, listId: true } });
  if (!current) throw new AppError('Lieu non trouvé', 404);

  let lat = req.body.lat;
  let lon = req.body.lon;
  if ((lat === undefined) !== (lon === undefined)) throw new AppError('Latitude et longitude doivent être fournies ensemble', 400);
  if (lat !== undefined) ({ latitude: lat, longitude: lon } = validateCoordinates(lat, lon));

  const place = await placesService.updatePlace(req.params.id, { ...req.body, lat, lon, updatedBy: req.user.id });
  res.json({ place });
});

const deletePlace = asyncHandler(async (req, res) => {
  const current = await prisma.place.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!current) throw new AppError('Lieu non trouvé', 404);
  await placesService.deletePlace(req.params.id);
  res.status(204).send();
});

const setPlaceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const allowedStatuses = [
    'to_visit',
    'visited',
    'favorite',
  ];

  if (!allowedStatuses.includes(status)) {
    throw new AppError(
      'Statut invalide',
      400
    );
  }

  const place = await prisma.place.findUnique({
    where: {
      id: req.params.id,
    },
    select: {
      id: true,
      listId: true,
    },
  });

  if (!place) {
    throw new AppError(
      'Lieu non trouvé',
      404
    );
  }

  // Vérifier que l'utilisateur appartient
  // à la liste du lieu.
  const membership =
    await prisma.listMember.findUnique({
      where: {
        listId_userId: {
          listId: place.listId,
          userId: req.user.id,
        },
      },
    });

  if (!membership) {
    throw new AppError(
      'Vous ne faites pas partie de cette liste',
      403
    );
  }

  const result =
    await prisma.userPlaceStatus.upsert({
      where: {
        userId_placeId: {
          userId: req.user.id,
          placeId: req.params.id,
        },
      },

      update: {
        status,
        updatedAt: new Date(),
      },

      create: {
        userId: req.user.id,
        placeId: req.params.id,
        status,
      },
    });

  res.json({
    status: result.status,
  });
});

module.exports = { listCategories, createPlace, getNearbyPlaces, getPlaceById, updatePlace, deletePlace, setPlaceStatus };
