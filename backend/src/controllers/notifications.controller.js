const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { listNotifications, ensureNotificationsTable } = require('../services/notifications.service');

const getNotifications = asyncHandler(async (req, res) => {
  res.json(await listNotifications(req.user.id));
});

const markNotificationRead = asyncHandler(async (req, res) => {
  await ensureNotificationsTable();
  const result = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { readAt: new Date() } });
  if (!result.count) throw new AppError('Notification non trouvée', 404);
  res.status(204).send();
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await ensureNotificationsTable();
  await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  res.status(204).send();
});

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead };
