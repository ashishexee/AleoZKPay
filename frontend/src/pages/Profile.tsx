import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

interface Invoice {
    id: string;
    amount: string;
    status: string;
    date: string;
}

const Profile = () => {
    const { address } = useWallet();
    const publicKey = address; // Alias for compatibility
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    // Mock data for now since fetchInvoices is not implemented
    const myInvoices: Invoice[] = [
        { id: '#1001', amount: '500 USDC', status: 'SETTLED', date: '2023-10-25' },
        { id: '#1002', amount: '120 USDC', status: 'PENDING', date: '2023-10-26' },
        { id: '#1003', amount: '2,000 USDC', status: 'SETTLED', date: '2023-10-27' },
    ];

    const merchant = {
        address: publicKey ? `${publicKey.slice(0, 10)}...${publicKey.slice(-5)}` : 'Not Connected',
        balance: '5,420 USDC', // Mock
        totalSales: '150,000 USDC', // Mock
        invoices: myInvoices.length
    };

    useEffect(() => {
        if (publicKey) {
            // loadMerchantData();
            setInvoices(myInvoices);
        }
    }, [publicKey]);



    return (
        <div className="page-container">
            {/* HEADER */}
            <div className="flex-between mb-8">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '32px' }}>Merchant Dashboard</h1>
                    <p className="text-label">Manage your earnings and invoices</p>
                </div>
                {publicKey && (
                    <div className="glass-card flex-center" style={{ padding: '12px 24px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{
                            display: 'inline-block', width: '8px', height: '8px', background: '#fff', borderRadius: '50%', marginRight: '12px',
                            boxShadow: '0 0 10px rgba(255,255,255,0.5)'
                        }}></span>
                        <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{merchant.address}</span>
                    </div>
                )}
            </div>

            {/* STATS */}
            <div className="grid-cols-3 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div className="glass-card">
                    <span className="text-label">Wallet Balance</span>
                    <h2 className="text-highlight" style={{ fontSize: '36px' }}>{merchant.balance}</h2>
                </div>
                <div className="glass-card">
                    <span className="text-label">Total Sales Volume</span>
                    <h2 style={{ fontSize: '36px' }}>{merchant.totalSales}</h2>
                </div>
                <div className="glass-card">
                    <span className="text-label">Total Invoices</span>
                    <h2 style={{ fontSize: '36px' }}>{merchant.invoices}</h2>
                </div>
            </div>

            {/* INVOICE HISTORY */}
            <div className="glass-card" style={{ padding: '0' }}>
                <div className="flex-between" style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3>Recent Invoices</h3>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Download CSV</button>
                </div>

                <div className="table-container">
                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th>Invoice ID</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'monospace', color: '#888' }}>{inv.id}</td>
                                    <td style={{ fontWeight: '600', color: '#fff' }}>{inv.amount}</td>
                                    <td>
                                        <StatusBadge status={inv.status as any} />
                                    </td>
                                    <td className="text-label">{inv.date}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500', opacity: 0.8 }}>View Details</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Profile;
