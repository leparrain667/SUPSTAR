const prisma = require('../lib/prisma');

let schemaReady;
function ensureNotificationsTable() {
  if (!schemaReady) {
    schemaReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(40) NOT NULL DEFAULT 'general',
        title VARCHAR(160) NOT NULL,
        message VARCHAR(500) NOT NULL,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `).then(() => prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read_at, created_at DESC)'));
  }
  return schemaReady;
}

async function createNotification({ userId, type, title, message, data = {} }) {
  await ensureNotificationsTable();
  return prisma.notification.create({ data: { userId, type, title, message, data } });
}

async function createNotifications(items) {
  if (!items.length) return;
  await ensureNotificationsTable();
  await prisma.notification.createMany({ data: items });
}

async function listNotifications(userId) {
  await ensureNotificationsTable();
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { notifications, unreadCount };
}

module.exports = { ensureNotificationsTable, createNotification, createNotifications, listNotifications };
