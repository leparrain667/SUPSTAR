const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { AppError } = require('./errorHandler');

// Vérifie le token JWT et attache req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentification requise', 401));
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    next(new AppError('Token invalide ou expiré', 401));
  }
}

// Vérifie que req.user a au moins un des rôles autorisés sur la liste ciblée
// (le listId doit être présent dans req.params.listId ou req.body.listId)
function requireListRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const listId = req.params.listId || req.body.listId;
      if (!listId) return next(new AppError('listId manquant', 400));
      const membership = await prisma.listMember.findUnique({
        where: { listId_userId: { listId, userId: req.user.id } },
      });
      if (!membership || !allowedRoles.includes(membership.role)) {
        return next(new AppError('Permissions insuffisantes sur cette liste', 403));
      }
      req.listRole = membership.role;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { requireAuth, requireListRole };
