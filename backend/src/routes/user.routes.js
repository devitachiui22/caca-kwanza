const router = require('express').Router();
const controller = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');

router.get('/profile', auth, controller.getProfile);
router.put('/profile', auth, controller.updateProfile);
router.get('/leaderboard', controller.getLeaderboard); // Público

module.exports = router;