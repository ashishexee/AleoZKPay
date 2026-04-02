const express = require('express');
const {
    updateProfile,
    getProfile,
    clearBurner,
    getCardWallet,
    upsertCardWallet,
    verifyCardLimitChange,
    recordCardSpend
} = require('../controllers/users.controller');

const router = express.Router();

router.post('/profile', updateProfile);
router.get('/profile/:address', getProfile);
router.post('/profile/clear-burner', clearBurner);
router.get('/card/:address', getCardWallet);
router.post('/card', upsertCardWallet);
router.post('/card/limits', verifyCardLimitChange);
router.post('/card/spend', recordCardSpend);

module.exports = router;
