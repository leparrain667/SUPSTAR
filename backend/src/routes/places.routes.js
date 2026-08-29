const router = require('express').Router();

const {
  listCategories,
  createPlace,
  getNearbyPlaces,
  getPlaceById,
  updatePlace,
  deletePlace,
  setPlaceStatus,
} = require('../controllers/places.controller');
const { uploadPhotos, deletePhoto } = require('../controllers/photos.controller');
const photoUpload = require('../middleware/photoUpload');

const {
  requireAuth,
  requireListRole,
} = require('../middleware/auth');

const {
  requirePlaceRole,
} = require('../middleware/placeRole');

router.use(requireAuth);

// Public to all members of the list
router.get('/categories', listCategories);
router.get('/nearby', getNearbyPlaces);
router.post('/:id/photos', requirePlaceRole('creator', 'editor'), photoUpload, uploadPhotos);
router.delete('/:id/photos/:photoId', requirePlaceRole('creator', 'editor'), deletePhoto);
router.get('/:id', getPlaceById);

// CREATOR + EDITOR
router.post(
  '/',
  requireListRole('creator', 'editor'),
  createPlace
);

router.put(
  '/:id',
  requirePlaceRole('creator', 'editor'),
  updatePlace
);

router.delete(
  '/:id',
  requirePlaceRole('creator', 'editor'),
  deletePlace
);

// Everyone can change THEIR OWN status
// (À visiter / Visité / Favori)
router.put(
  '/:id/status',
  setPlaceStatus
);

module.exports = router;
