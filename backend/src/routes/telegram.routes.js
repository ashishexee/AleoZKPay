const express = require('express');
const {
    createTelegramLinkSession,
    getTelegramLinkSession,
    completeTelegramLinkSession,
    unlinkTelegramAccount
} = require('../controllers/telegram.controller');

const router = express.Router();

router.post('/link-sessions', createTelegramLinkSession);
router.get('/link-sessions/:token', getTelegramLinkSession);
router.post('/link-sessions/complete', completeTelegramLinkSession);
router.post('/unlink', unlinkTelegramAccount);

module.exports = router;
