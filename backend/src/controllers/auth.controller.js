const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new AppError('Le mot de passe doit contenir entre 8 et 128 caractères', 400);
  }
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

const register = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  const displayName = String(req.body.displayName || '').trim();
  if (!email || !password || !displayName) {
    throw new AppError('email, password et displayName sont requis', 400);
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError('Adresse email invalide', 400);
  validatePassword(password);
  if (displayName.length > 100) throw new AppError('Le nom affiché est trop long', 400);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Un compte existe déjà avec cet email', 409);

  const passwordHash = await bcrypt.hash(password, 12);

  // Un utilisateur créé = une liste personnelle créée automatiquement
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, passwordHash, displayName } });
    await tx.list.create({
      data: {
        name: 'Mes lieux',
        isPersonal: true,
        ownerId: created.id,
        members: { create: { userId: created.id, role: 'creator' } },
      },
    });
    return created;
  });

  const token = signToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  if (!email || typeof password !== 'string') throw new AppError('Identifiants invalides', 401);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    throw new AppError('Identifiants invalides', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Identifiants invalides', 401);

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
  });
  if (!user) throw new AppError('Utilisateur non trouvé', 404);
  res.json({ user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  validatePassword(newPassword);
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user?.passwordHash || !await bcrypt.compare(String(currentPassword || ''), user.passwordHash)) {
    throw new AppError('Mot de passe actuel incorrect', 401);
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ message: 'Mot de passe modifié avec succès' });
});

module.exports = { register, login, me, changePassword, signToken };
