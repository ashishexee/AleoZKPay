const express = require('express');
const { createInvoiceMCP } = require('../controllers/sdk.controller');

const router = express.Router();

router.post('/relay/create-invoice', createInvoiceMCP);

module.exports = router;
