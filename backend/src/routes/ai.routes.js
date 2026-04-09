const express = require('express');
const { getAIModels, dashboardAssistantChat, developerAssistantChat, nullBotChat } = require('../controllers/ai.controller');

const router = express.Router();

router.get('/ai/models', getAIModels);
router.post('/nullbot/chat', nullBotChat);
router.post('/dashboard-assistant/chat', dashboardAssistantChat);
router.post('/developer-assistant/chat', developerAssistantChat);

module.exports = router;
