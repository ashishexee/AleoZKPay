
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Explorer from './pages/Explorer';
import CreateInvoice from './pages/CreateInvoice';
import PaymentPage from './pages/PaymentPage';
import Profile from '../pages/Profile';
import Docs from './pages/Docs';
import Privacy from './pages/Privacy';
import Verification from './pages/Verification';

const DesktopAnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Explorer />} />
                <Route path="/create" element={<CreateInvoice />} />
                <Route path="/pay" element={<PaymentPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/verify" element={<Verification />} />
            </Routes>
        </AnimatePresence>
    );
};

const DesktopApp = () => {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>

            <Navbar />

            <main className="relative z-10 pt-24 px-4 pb-12 container-custom">
                <DesktopAnimatedRoutes />
            </main>
        </div>
    );
};

export default DesktopApp;
