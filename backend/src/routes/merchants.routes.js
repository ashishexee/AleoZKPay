const express = require('express');
const { registerMerchant } = require('../controllers/merchants.controller');

const router = express.Router();

router.post('/register', registerMerchant);

module.exports = router;
