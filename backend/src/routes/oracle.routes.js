const express = require('express');
const { getQuote } = require('../controllers/oracle.controller');

const router = express.Router();

// Used as /api/oracle
// Route: /api/oracle/quote
router.get('/quote', getQuote);

module.exports = router;
