const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/lists', require('./lists.routes'));
router.use('/places', require('./places.routes'));
router.use('/', require('./reviews.routes'));

module.exports = router;
