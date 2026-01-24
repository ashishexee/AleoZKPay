import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

const Navbar = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="container-custom flex-between" style={{ height: '100%' }}>
                {/* LOGO */}
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <div className="flex-center" style={{ gap: '12px' }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            background: '#fff',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(255,255,255,0.2)'
                        }}>
                            <div style={{
                                width: 12,
                                height: 12,
                                border: '2px solid black',
                                transform: 'rotate(45deg)'
                            }} />
                        </div>
                        <div className="flex-col">
                            <span style={{ fontSize: 20, fontWeight: '700', color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>
                                AleoZKPay
                            </span>
                        </div>
                    </div>
                </Link>

                {/* NAVIGATION */}
                <div className="nav-links">
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Explorer</Link>
                    <Link to="/create" className={`nav-link ${isActive('/create') ? 'active' : ''}`}>Create Invoice</Link>
                    <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
                </div>

                {/* CONNECT BUTTON */}
                <div className="wallet-adapter-button-trigger">
                    <WalletMultiButton className="btn-connect" />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
