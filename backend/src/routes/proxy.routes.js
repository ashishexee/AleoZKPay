const express = require('express');
const {
    proxyJwts,
} = require('../controllers/provable.controller');

const router = express.Router();

// Used as /api/proxy/provable
router.post('/jwts/:id', proxyJwts);

module.exports = router;
