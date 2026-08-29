const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const reviewsService = require('../services/reviews.service');

function validateRating(value) {
  const rating = Number(value);

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new AppError(
      'La note doit être un entier entre 1 et 5',
      400
    );
  }

  return rating;
}

function validateComment(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const comment = String(value).trim();

  if (comment.length > 2000) {
    throw new AppError(
      'Le commentaire ne peut pas dépasser 2000 caractères',
      400
    );
  }

  return comment || null;
}

async function getPlaceMembership(
  placeId,
  userId
) {
  const place =
    await prisma.place.findUnique({
      where: {
        id: placeId,
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

  const membership =
    await prisma.listMember.findUnique({
      where: {
        listId_userId: {
          listId: place.listId,
          userId,
        },
      },
    });

  if (!membership) {
    throw new AppError(
      'Accès interdit à ce lieu',
      403
    );
  }

  return {
    place,
    membership,
  };
}

const listReviews = asyncHandler(async (req, res) => {
  await getPlaceMembership(
    req.params.placeId,
    req.user.id
  );

  const reviews = await reviewsService.listReviews(
    req.params.placeId
  );

  res.json({ reviews });
});

const createReview = asyncHandler(async (req, res) => {
 const { membership } =
  await getPlaceMembership(
    req.params.placeId,
    req.user.id
  );

if (
  ![
    'creator',
    'editor',
    'commentator',
  ].includes(membership.role)
) {
  throw new AppError(
    'Votre rôle ne permet pas de publier un avis',
    403
  );
}

  const existing = await prisma.review.findUnique({
    where: {
      placeId_userId: {
        placeId: req.params.placeId,
        userId: req.user.id,
      },
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      'Vous avez déjà publié un avis pour ce lieu',
      409
    );
  }

  const rating = validateRating(req.body.rating);
  const comment = validateComment(req.body.comment);

  const review = await reviewsService.createReview({
    placeId: req.params.placeId,
    userId: req.user.id,
    rating,
    comment,
  });

  res.status(201).json({ review });
});

const updateReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.reviewId },
    select: {
      id: true,
      placeId: true,
      userId: true,
    },
  });

  if (
    !review ||
    review.placeId !== req.params.placeId
  ) {
    throw new AppError('Avis non trouvé', 404);
  }

  const { membership } = await getPlaceMembership(
    req.params.placeId,
    req.user.id
  );
  const canModerate = ['creator', 'editor'].includes(membership.role);
  if (membership.role === 'reader' || (review.userId !== req.user.id && !canModerate)) {
    throw new AppError('Vous ne pouvez pas modifier cet avis', 403);
  }

  const rating = validateRating(req.body.rating);
  const comment = validateComment(req.body.comment);

  const updated =
    await reviewsService.updateReview({
      reviewId: review.id,
      rating,
      comment,
    });

  res.json({ review: updated });
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.reviewId },
    select: {
      id: true,
      placeId: true,
      userId: true,
    },
  });

  if (
    !review ||
    review.placeId !== req.params.placeId
  ) {
    throw new AppError('Avis non trouvé', 404);
  }

  const { membership } = await getPlaceMembership(
    req.params.placeId,
    req.user.id
  );

  const canModerate =
    ['creator', 'editor'].includes(membership.role);

  if (
    review.userId !== req.user.id &&
    !canModerate
  ) {
    throw new AppError(
      'Vous ne pouvez supprimer que votre propre avis',
      403
    );
  }

  await reviewsService.deleteReview(review.id);

  res.status(204).send();
});

module.exports = {
  listReviews,
  createReview,
  updateReview,
  deleteReview,
};
