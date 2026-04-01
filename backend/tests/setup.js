process.env.PORT = '0'; // Let OS assign port for tests
process.env.SUPABASE_URL = 'https://fake-supabase-url.supabase.co';
process.env.SUPABASE_ANON_KEY = 'fake-anon-key';
process.env.PROVABLE_API_KEY = 'fake-provable-key';
process.env.PROVABLE_CONSUMER_ID = 'fake-consumer-id';
process.env.GOOGLE_API_KEY = 'fake-google-key';
process.env.RELAYER_PRIVATE_KEY = 'APrivateKey1zkp2Xxxx'; // dummy

// Mock Supabase globally
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'mock-id', name: 'Test Store' }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'mock-id', name: 'Test Store' }, error: null }),
    }))
}));

// Mock Provable SDK globally
jest.mock('@provablehq/sdk', () => {
    return {
        AleoNetworkClient: jest.fn().mockImplementation(() => ({
            submitProvingRequestSafe: jest.fn().mockResolvedValue({
                ok: true,
                data: { transaction: { id: 'mock-tx-123' }, broadcast_result: { id: 'mock-tx-123' } }
            })
        })),
        Account: jest.fn().mockImplementation(() => ({
            privateKey: jest.fn().mockReturnValue('mockPk'),
            address: jest.fn().mockReturnValue('mockAddr')
        })),
        AleoKeyProvider: jest.fn().mockImplementation(() => ({
            useCache: jest.fn()
        })),
        NetworkRecordProvider: jest.fn().mockImplementation(() => ({})),
        ProgramManager: jest.fn().mockImplementation(() => ({
            setAccount: jest.fn(),
            buildAuthorization: jest.fn().mockResolvedValue({
                toExecutionId: () => ({ toString: () => 'exec-id' })
            }),
            buildFeeAuthorization: jest.fn().mockResolvedValue({}),
            estimateFeeForAuthorization: jest.fn().mockResolvedValue(100000n)
        })),
        ProvingRequest: {
            new: jest.fn().mockReturnValue({})
        },
        Authorization: {
            fromString: jest.fn().mockReturnValue({
                toExecutionId: () => ({ toString: () => 'exec-id' })
            })
        }
    };
});
