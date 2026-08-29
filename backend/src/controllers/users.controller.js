const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

const getSettings = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, displayName: true, avatarUrl: true, passwordHash: true,
      travelPreference: true,
      oauthAccounts: { select: { provider: true } },
    },
  });
  if (!user) throw new AppError('Utilisateur non trouvé', 404);
  const { passwordHash, ...safeUser } = user;
  res.json({ user: { ...safeUser, hasPassword: Boolean(passwordHash) } });
});

const updateProfile = asyncHandler(async (req, res) => {
  const displayName = String(req.body.displayName || '').trim();
  const avatarUrl = req.body.avatarUrl ? String(req.body.avatarUrl).trim() : null;
  if (!displayName || displayName.length > 100) throw new AppError('Nom affiché invalide', 400);
  if (avatarUrl && (!/^https?:\/\//i.test(avatarUrl) || avatarUrl.length > 500)) throw new AppError('URL d’avatar invalide', 400);
  const user = await prisma.user.update({
    where: { id: req.user.id }, data: { displayName, avatarUrl },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
  res.json({ user });
});

const updatePreferences = asyncHandler(async (req, res) => {
  const preferredCategories = Array.isArray(req.body.preferredCategories)
    ? req.body.preferredCategories.map(String).map((x) => x.trim()).filter(Boolean).slice(0, 20) : [];
  const preferredLanguages = Array.isArray(req.body.preferredLanguages)
    ? req.body.preferredLanguages.map(String).map((x) => x.trim()).filter(Boolean).slice(0, 10) : [];
  const budgetRange = req.body.budgetRange ? String(req.body.budgetRange).slice(0, 20) : null;
  const notificationSettings = typeof req.body.notificationSettings === 'object' && req.body.notificationSettings
    ? req.body.notificationSettings : {};
  const preferences = await prisma.travelPreference.upsert({
    where: { userId: req.user.id },
    update: { preferredCategories, preferredLanguages, budgetRange, notificationSettings, updatedAt: new Date() },
    create: { userId: req.user.id, preferredCategories, preferredLanguages, budgetRange, notificationSettings },
  });
  res.json({ preferences });
});

module.exports = { getSettings, updateProfile, updatePreferences };
