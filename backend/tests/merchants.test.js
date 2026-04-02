const request = require('supertest');
const app = require('../index');

describe('Merchant Endpoints', () => {
    it('POST /api/merchants/register should register a merchant and return a secret key', async () => {
        const res = await request(app)
            .post('/api/merchants/register')
            .send({
                name: 'Test Store',
                aleo_address: 'aleo1mockaddress',
                webhook_url: 'https://webhook.mock/test'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('name', 'Test Store');
        expect(res.body).toHaveProperty('secret_key');
        expect(res.body).toHaveProperty('webhook_url', 'https://webhook.mock/test');
    });

    it('POST /api/merchants/register should return 400 if fields are missing', async () => {
        const res = await request(app)
            .post('/api/merchants/register')
            .send({ name: 'Only Name' });

        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error');
    });
});
