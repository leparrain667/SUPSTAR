const router = require('express').Router();

const {
  listReviews,
  createReview,
  updateReview,
  deleteReview,
} = require('../controllers/reviews.controller');

const {
  requireAuth,
} = require('../middleware/auth');

const {
  requireReviewRole,
} = require('../middleware/reviewRole');

router.use(requireAuth);

// Everyone in the list can read reviews
router.get(
  '/places/:placeId/reviews',
  listReviews
);

// Creator + Editor + Commentator
router.post(
  '/places/:placeId/reviews',
  requireReviewRole(
    'creator',
    'editor',
    'commentator'
  ),
  createReview
);

// Creator + Editor + owner commentator
router.put(
  '/places/:placeId/reviews/:reviewId',
  requireReviewRole(
    'creator',
    'editor',
    'commentator'
  ),
  updateReview
);

// Creator + Editor + owner commentator
router.delete(
  '/places/:placeId/reviews/:reviewId',
  requireReviewRole(
    'creator',
    'editor',
    'commentator'
  ),
  deleteReview
);

module.exports = router;