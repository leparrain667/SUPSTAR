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
  const secure = String(process.env.CLIENT_URL || '').startsWith('https://');
  // The callback is a top-level navigation from Google to the API. Use a
  // root-scoped cookie so every callback path receives the state value.
  // SameSite=None is required when the deployed frontend/API use different
  // sites; Secure is enabled automatically for HTTPS deployments.
  const sameSite = secure ? 'None' : 'Lax';
  res.setHeader('Set-Cookie', `supstar_oauth_state=${state}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=600${secure ? '; Secure' : ''}`);
  return passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(req, res, next);
});

function validateOAuthState(req, res, next) {
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), part.slice(index + 1)];
  }).filter(([key]) => key));
  const expected = cookies.supstar_oauth_state;
  const received = String(req.query.state || '');
  const secure = String(process.env.CLIENT_URL || '').startsWith('https://');
  res.setHeader('Set-Cookie', `supstar_oauth_state=; HttpOnly; SameSite=${secure ? 'None' : 'Lax'}; Path=/; Max-Age=0${secure ? '; Secure' : ''}`);
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
