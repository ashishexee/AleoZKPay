const express = require('express');
const requireMerchantAuth = require('../middlewares/auth.middleware');
const { validateOnboard } = require('../controllers/sdk.controller');

const router = express.Router();

router.post('/onboard/validate', requireMerchantAuth, validateOnboard);

module.exports = router;
