const express = require('express');
const { submitSupportFeedback } = require('../controllers/support.controller');

const router = express.Router();

router.post('/feedback', submitSupportFeedback);

module.exports = router;
