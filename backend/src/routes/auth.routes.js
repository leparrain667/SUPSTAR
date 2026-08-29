const router = require('express').Router();
const { register, login, me, changePassword, signToken } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const passport = require('../config/passport');
const rateLimit = require('../middleware/rateLimit');
const crypto = require('crypto');

const authLimiter = rateLimit({ max: 15, windowMs: 15 * 60 * 1000 });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', requireAuth, me);
router.put('/password', requireAuth, changePassword);

router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    return res.status(503).json({ error: { message: 'OAuth Google n’est pas configuré' } });
  }
  const state = crypto.randomBytes(32).toString('base64url');
  const secure = String(process.env.CLIENT_URL || '').startsWith('https://') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `supstar_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=600${secure}`);
  return passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(req, res, next);
});

function validateOAuthState(req, res, next) {
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), part.slice(index + 1)];
  }).filter(([key]) => key));
  const expected = cookies.supstar_oauth_state;
  const received = String(req.query.state || '');
  res.setHeader('Set-Cookie', 'supstar_oauth_state=; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=0');
  if (!expected || expected.length !== received.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))) {
    return res.status(401).json({ error: { message: 'État OAuth invalide ou expiré' } });
  }
  return next();
}

router.get('/google/callback', validateOAuthState, passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }), (req, res) => {
  const token = signToken(req.user);
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/oauth/callback#token=${encodeURIComponent(token)}`);
});
router.get('/google/failure', (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/login?oauth=error`);
});

module.exports = router;
