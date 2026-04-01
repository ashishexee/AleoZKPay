const express = require('express');
const { updateProfile, getProfile, clearBurner } = require('../controllers/users.controller');

const router = express.Router();

router.post('/profile', updateProfile);
router.get('/profile/:address', getProfile);
router.post('/profile/clear-burner', clearBurner);

module.exports = router;
