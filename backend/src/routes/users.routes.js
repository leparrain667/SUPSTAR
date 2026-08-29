const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getSettings, updateProfile, updatePreferences } = require('../controllers/users.controller');

router.use(requireAuth);
router.get('/me/settings', getSettings);
router.put('/me/profile', updateProfile);
router.put('/me/preferences', updatePreferences);

module.exports = router;
