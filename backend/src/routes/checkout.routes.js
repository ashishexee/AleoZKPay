const express = require('express');
const { createSession, getSession, updateSession } = require('../controllers/checkout.controller');
const requireMerchantAuth = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/sessions', requireMerchantAuth, createSession);
router.get('/sessions/:id', getSession);
router.patch('/sessions/:id', updateSession);

module.exports = router;
