const request = require('supertest');
const app = require('../index');

describe('General Endpoints', () => {
    it('should return 200 and a running message on GET /', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toBe('AleoZKPay Backend is running');
    });
});
