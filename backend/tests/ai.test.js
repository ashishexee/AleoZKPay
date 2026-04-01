const request = require('supertest');
const app = require('../index');

describe('AI Assistant Endpoints', () => {

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /api/ai/models should fetch available Gemini models', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                models: [
                    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generatecontent'] },
                    { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generatecontent'] }
                ]
            })
        });

        const res = await request(app).get('/api/ai/models');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('configuredModels');
        expect(res.body).toHaveProperty('availableModels');
        expect(res.body.availableModels.length).toBeGreaterThan(0);
    });

    it('POST /api/dashboard-assistant/chat should return a valid reply', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [
                    { content: { parts: [{ text: 'Hello from NullBot dashboard assistant' }] } }
                ]
            })
        }); // Mock for generation
        // Note: fetchAvailableGeminiModels caches models, so no need to double mock if they exist.
        // We might need to mock fetch twice if cache isn't available.

        const res = await request(app)
            .post('/api/dashboard-assistant/chat')
            .send({ message: 'Hi', context: { mode: 'dashboard' } });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('reply', 'Hello from NullBot dashboard assistant');
    });

    it('POST /api/developer-assistant/chat should return a valid developer reply', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [
                    { content: { parts: [{ text: 'Here is your developer answer: use SDK.' }] } }
                ]
            })
        });

        const res = await request(app)
            .post('/api/developer-assistant/chat')
            .send({ message: 'How do I use SDK?', context: { mode: 'docs' } });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('reply', 'Here is your developer answer: use SDK.');
    });

});
