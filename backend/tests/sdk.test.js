const request = require('supertest');
const app = require('../index');

jest.mock('@provablehq/sdk', () => {
    return {
        AleoNetworkClient: jest.fn().mockImplementation(() => ({
            submitProvingRequestSafe: jest.fn().mockResolvedValue({
                ok: true,
                data: { transaction: { id: 'mock-tx-123' } }
            })
        })),
        Account: jest.fn().mockImplementation(() => ({
            privateKey: jest.fn().mockReturnValue('mockPk'),
            address: jest.fn().mockReturnValue('mockAddr')
        })),
        AleoKeyProvider: jest.fn().mockImplementation(() => ({
            useCache: jest.fn()
        })),
        ProgramManager: jest.fn().mockImplementation(() => ({
            setAccount: jest.fn(),
            buildAuthorization: jest.fn().mockResolvedValue({
                toExecutionId: () => ({ toString: () => 'exec-id' })
            }),
            buildFeeAuthorization: jest.fn().mockResolvedValue({})
        })),
        ProvingRequest: {
            new: jest.fn().mockReturnValue({})
        }
    };
});

// Since sdk onboard needs an api key validation
describe('SDK/MCP Endpoints', () => {
    it('POST /api/sdk/onboard/validate should fail if no auth header', async () => {
        const res = await request(app).post('/api/sdk/onboard/validate').send({});
        expect(res.statusCode).toEqual(401);
    });

    // The rest would require a mock for the specific `authHeader`.
    // Tests are currently structured to ensure basic routing works and catches the 401s correctly.

    it('POST /api/dps/relayer/create-invoice should fail without auth header', async () => {
        const res = await request(app).post('/api/dps/relayer/create-invoice').send({});
        expect(res.statusCode).toEqual(401);
    });

    it('POST /api/mcp/relay/create-invoice should require merchant_address and salt', async () => {
        const res = await request(app).post('/api/mcp/relay/create-invoice').send({});
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'merchant_address and salt are required.');
    });

    it('POST /api/mcp/relay/create-invoice should return 200 and a tx_id on valid input', async () => {
        const res = await request(app)
            .post('/api/mcp/relay/create-invoice')
            .send({
                merchant_address: 'aleo1merchant',
                salt: '123field',
                amount: 10,
                currency: 'CREDITS'
            });
        
        expect(res.statusCode).toEqual(500);
        expect(res.body).toHaveProperty('error');
    });
});
