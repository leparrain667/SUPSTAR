const prisma = require('../lib/prisma');
const { AppError } = require('./errorHandler');

function requirePlaceRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const place = await prisma.place.findUnique({ where: { id: req.params.id }, select: { listId: true } });
      if (!place) return next(new AppError('Lieu non trouvé', 404));
      const membership = await prisma.listMember.findUnique({
        where: { listId_userId: { listId: place.listId, userId: req.user.id } },
      });
      if (!membership || !allowedRoles.includes(membership.role)) return next(new AppError('Permissions insuffisantes sur ce lieu', 403));
      req.placeListId = place.listId;
      req.listRole = membership.role;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requirePlaceRole };
