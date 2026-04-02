const express = require('express');
const {
    scannerProxy,
    proxyJwts,
    dpsJwt,
    dpsPubkey,
    dpsProve,
    dpsSponsorSweep
} = require('../controllers/provable.controller');

const router = express.Router();

// Scanner Proxy (mounted at /api/scanner/:network in index.js, so the sub-path here is /)
router.all('/', scannerProxy);
router.all('/*', scannerProxy); // capture sub-paths for proxy

module.exports = {
    scannerRouter: router
};
