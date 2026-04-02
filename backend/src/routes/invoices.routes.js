const express = require('express');
const { getInvoices, getInvoicesByMerchant, getRecentInvoices, getInvoiceByHash, createInvoice, updateInvoice } = require('../controllers/invoices.controller');

const router = express.Router();

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/merchant/:hash', getInvoicesByMerchant);
router.get('/recent', getRecentInvoices);
router.get('/:hash', getInvoiceByHash);
router.patch('/:hash', updateInvoice);

module.exports = router;
