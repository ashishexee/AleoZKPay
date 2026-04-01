const express = require('express');
const {
    dpsJwt,
    dpsPubkey,
    dpsProve,
    dpsSponsorSweep
} = require('../controllers/provable.controller');
const requireMerchantAuth = require('../middlewares/auth.middleware');
const { createInvoiceRelayer } = require('../controllers/sdk.controller');

const router = express.Router();

// Used as /api/dps
router.post('/jwt', dpsJwt);
router.get('/pubkey', dpsPubkey);
router.post('/prove', dpsProve);
router.post('/sponsor-sweep', dpsSponsorSweep);
router.post('/relayer/create-invoice', requireMerchantAuth, createInvoiceRelayer);

module.exports = router;
