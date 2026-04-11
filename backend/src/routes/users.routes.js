const express = require('express');
const {
    updateProfile,
    getProfile,
    clearBurner,
    getCardWallet,
    upsertCardWallet,
    lookupCardWallet,
    verifyCardLimitChange,
    deleteCardWallet,
    recordCardSpend
} = require('../controllers/users.controller');

const router = express.Router();

router.post('/profile', updateProfile);
router.get('/profile/:address', getProfile);
router.post('/profile/clear-burner', clearBurner);
router.get('/card/:address', getCardWallet);
router.post('/card', upsertCardWallet);
router.post('/card/lookup', lookupCardWallet);
router.post('/card/limits', verifyCardLimitChange);
router.delete('/card', deleteCardWallet);
router.post('/card/spend', recordCardSpend);

module.exports = router;
