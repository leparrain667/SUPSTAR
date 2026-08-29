const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const prisma = require('../lib/prisma');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      const providerUserId = profile.id;
      const email = profile.emails?.[0]?.value?.toLowerCase();
      if (!email) return done(new Error('Le compte Google ne fournit pas d’adresse email'));
      const account = await prisma.oAuthAccount.findUnique({
        where: { provider_providerUserId: { provider: 'google', providerUserId } },
        include: { user: true },
      });
      if (account) return done(null, account.user);

      const user = await prisma.$transaction(async (tx) => {
        let existing = await tx.user.findUnique({ where: { email } });
        if (!existing) {
          existing = await tx.user.create({
            data: { email, displayName: profile.displayName || email.split('@')[0], avatarUrl: profile.photos?.[0]?.value },
          });
          await tx.list.create({
            data: { name: 'Mes lieux', isPersonal: true, ownerId: existing.id, members: { create: { userId: existing.id, role: 'creator' } } },
          });
        }
        await tx.oAuthAccount.create({ data: { userId: existing.id, provider: 'google', providerUserId } });
        return existing;
      });
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

module.exports = passport;
