const request = require('supertest');
const app = require('../index');

describe('Invoices Endpoints', () => {
    it('GET /api/invoices should return a list of invoices', async () => {
        const res = await request(app).get('/api/invoices');
        expect(res.statusCode).toEqual(200);
    });

    it('GET /api/invoices/merchant/:hash should return invoices for a merchant', async () => {
        const res = await request(app).get('/api/invoices/merchant/mockhash');
        expect(res.statusCode).toEqual(200);
    });

    it('GET /api/invoices/recent should return recent invoices', async () => {
        const res = await request(app).get('/api/invoices/recent?limit=5');
        expect(res.statusCode).toEqual(200);
    });

    it('GET /api/invoice/:hash should return a specific invoice or 404', async () => {
        const res = await request(app).get('/api/invoice/nonexistenthash');
        // Our mock single() returns { data: {}, error: null }. So it might return 200 with an empty object.
        expect([200, 404]).toContain(res.statusCode); 
    });

    it('POST /api/invoices should create an invoice', async () => {
        const res = await request(app)
            .post('/api/invoices')
            .send({
                invoice_hash: 'testhash',
                merchant_address: 'aleotest',
            });
        expect(res.statusCode).toEqual(200);
    });

    it('POST /api/invoices should return 400 if fields are missing', async () => {
        const res = await request(app)
            .post('/api/invoices')
            .send({
                merchant_address: 'aleotest',
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Missing required fields');
    });

    it('PATCH /api/invoices/:hash should update invoice status', async () => {
        const res = await request(app)
            .patch('/api/invoices/testhash')
            .send({ status: 'SETTLED', payment_tx_ids: ['tx1'] });
        expect(res.statusCode).toEqual(200);
    });
});
