const prisma = require('../lib/prisma');

async function refreshPlaceRating(tx, placeId) {
  const aggregate = await tx.review.aggregate({
    where: { placeId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await tx.place.update({
    where: { id: placeId },
    data: {
      avgRating: aggregate._avg.rating ?? 0,
      reviewCount: aggregate._count._all,
    },
  });
}

async function listReviews(placeId) {
  return prisma.review.findMany({
    where: { placeId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

async function createReview({ placeId, userId, rating, comment }) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        placeId,
        userId,
        rating,
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await refreshPlaceRating(tx, placeId);

    return review;
  }, { maxWait: 10000, timeout: 30000 });
}

async function updateReview({ reviewId, rating, comment }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.review.findUnique({
      where: { id: reviewId },
      select: { placeId: true },
    });

    if (!existing) return null;

    const review = await tx.review.update({
      where: { id: reviewId },
      data: {
        rating,
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await refreshPlaceRating(tx, existing.placeId);

    return review;
  }, { maxWait: 10000, timeout: 30000 });
}

async function deleteReview(reviewId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.review.findUnique({
      where: { id: reviewId },
      select: { placeId: true },
    });

    if (!existing) return null;

    await tx.review.delete({
      where: { id: reviewId },
    });

    await refreshPlaceRating(tx, existing.placeId);

    return {
      placeId: existing.placeId,
    };
  }, { maxWait: 10000, timeout: 30000 });
}

module.exports = {
  listReviews,
  createReview,
  updateReview,
  deleteReview,
};
