const prisma = require('../lib/prisma');
const { AppError } = require('./errorHandler');

function requireReviewRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const { placeId, reviewId } = req.params;

      // Find the place to know which list it belongs to
      const place = await prisma.place.findUnique({
        where: {
          id: placeId,
        },
        select: {
          listId: true,
        },
      });

      if (!place) {
        return next(
          new AppError('Lieu non trouvé', 404)
        );
      }

      // Check membership in the list
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
        return next(
          new AppError(
            'Vous ne faites pas partie de cette liste.',
            403
          )
        );
      }

      /*
       * CREATE REVIEW
       *
       * No reviewId means this is a POST.
       */
      if (!reviewId) {
        if (!allowedRoles.includes(membership.role)) {
          return next(
            new AppError(
              'Permissions insuffisantes pour ajouter un avis.',
              403
            )
          );
        }

        req.reviewListId = place.listId;
        req.listRole = membership.role;

        return next();
      }

      /*
       * UPDATE / DELETE REVIEW
       *
       * Find the review.
       */
      const review = await prisma.review.findUnique({
        where: {
          id: reviewId,
        },
        select: {
          id: true,
          userId: true,
          placeId: true,
        },
      });

      if (!review) {
        return next(
          new AppError('Avis non trouvé', 404)
        );
      }

      // Make sure the review belongs to this place
      if (review.placeId !== placeId) {
        return next(
          new AppError(
            'Cet avis ne correspond pas à ce lieu.',
            400
          )
        );
      }

      /*
       * Creator and editor can moderate reviews.
       */
      if (
        membership.role === 'creator' ||
        membership.role === 'editor'
      ) {
        req.reviewListId = place.listId;
        req.listRole = membership.role;
        req.reviewOwner = review.userId === req.user.id;

        return next();
      }

      /*
       * Commentator can modify/delete ONLY
       * their own review.
       */
      if (
        membership.role === 'commentator' &&
        review.userId === req.user.id
      ) {
        req.reviewListId = place.listId;
        req.listRole = membership.role;
        req.reviewOwner = true;

        return next();
      }

      return next(
        new AppError(
          'Vous ne pouvez pas modifier ou supprimer cet avis.',
          403
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  requireReviewRole,
};