import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Home from './pages/home';
import Explorer from './pages/explorer';
import CreateInvoice from './pages/createinvoice';
import PaymentPage from './pages/payment';
import Profile from '../shared/pages/profile';
import ProfileQRPage from '../shared/pages/profileqr';
import Privacy from './pages/privacy';
import Verification from './pages/verification';
import Vision from './pages/vision';
import { ChangelogOverlay } from './components/overlays/ChangelogOverlay';
import CheckoutPage from '../shared/pages/checkout';
import InvoiceDetails from '../shared/pages/invoicedetails';
import DeveloperPortal from '../shared/pages/developer';
import GiftCardsPage from '../shared/pages/giftcards';
import TelegramLinkPage from '../shared/pages/telegramlink';
import TelegramBotPage from '../shared/pages/telegrambot';
import AuditVerifyPage from '../shared/pages/auditverify';
import SupportFeedbackPage from '../shared/pages/supportfeedback';
import CardsPage from './pages/CardsPage';
import { ProtectedRoute } from '../shared/components/routing/ProtectedRoute';
import Docs from './pages/docs';

const DesktopAnimatedRoutes = () => {
    const location = useLocation();
    const routeKey = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile') ? '/dashboard' : location.pathname;

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={routeKey}>
                <Route path="/explorer" element={<Explorer />} />
                <Route path="/create" element={<ProtectedRoute><CreateInvoice /></ProtectedRoute>} />
                <Route path="/pay" element={<PaymentPage />} />
                <Route path="/dashboard/*" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/profile/*" element={<Navigate to="/dashboard" replace />} />
                <Route path="/giftcards" element={<ProtectedRoute><GiftCardsPage /></ProtectedRoute>} />
                <Route path="/profile-qr" element={<ProtectedRoute><ProfileQRPage /></ProtectedRoute>} />
                <Route path="/support-feedback" element={<ProtectedRoute><SupportFeedbackPage /></ProtectedRoute>} />
                <Route path="/vision" element={<Vision />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/verify" element={<Verification />} />
                <Route path="/developer" element={<DeveloperPortal />} />
                <Route path="/telegram-bot" element={<TelegramBotPage />} />
                <Route path="/telegram/link" element={<TelegramLinkPage />} />
                <Route path="/audit/verify" element={<AuditVerifyPage />} />
                <Route path="/checkout/:id" element={<CheckoutPage />} />
                <Route path="/invoice/:hash" element={<InvoiceDetails />} />
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
            <ChangelogOverlay />

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cards" element={
                    <main className="relative z-10 pt-24 w-full">
                        <ProtectedRoute><CardsPage /></ProtectedRoute>
                    </main>
                } />
                <Route path="*" element={
                    <main className="relative z-10 pt-24 px-4 pb-12 container-custom">
                        <DesktopAnimatedRoutes />
                    </main>
                } />
            </Routes>
        </div>
    );
};

export default DesktopApp;
