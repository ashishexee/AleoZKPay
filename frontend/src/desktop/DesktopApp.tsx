import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Home from './pages/home';
import { ChangelogOverlay } from './components/overlays/ChangelogOverlay';
import { ProtectedRoute } from '../shared/components/routing/ProtectedRoute';

const Explorer = lazy(() => import('./pages/explorer'));
const CreateInvoice = lazy(() => import('./pages/createinvoice'));
const PaymentPage = lazy(() => import('./pages/payment'));
const Profile = lazy(() => import('../shared/pages/profile'));
const ProfileQRPage = lazy(() => import('../shared/pages/profileqr'));
const Privacy = lazy(() => import('./pages/privacy'));
const Verification = lazy(() => import('./pages/verification'));
const Vision = lazy(() => import('./pages/vision'));
const CheckoutPage = lazy(() => import('../shared/pages/checkout'));
const InvoiceDetails = lazy(() => import('../shared/pages/invoicedetails'));
const DeveloperPortal = lazy(() => import('../shared/pages/developer'));
const GiftCardsPage = lazy(() => import('../shared/pages/giftcards'));
const TelegramLinkPage = lazy(() => import('../shared/pages/telegramlink'));
const TelegramBotPage = lazy(() => import('../shared/pages/telegrambot'));
const AuditVerifyPage = lazy(() => import('../shared/pages/auditverify'));
const SupportFeedbackPage = lazy(() => import('../shared/pages/supportfeedback'));
const CardsPage = lazy(() => import('./pages/CardsPage'));
const Docs = lazy(() => import('./pages/docs'));

const RouteFallback = () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
);

const DesktopAnimatedRoutes = () => {
    const location = useLocation();
    const routeKey = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile') ? '/dashboard' : location.pathname;

    return (
        <AnimatePresence mode="wait">
            <Suspense fallback={<RouteFallback />}>
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
            </Suspense>
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
                        <Suspense fallback={<RouteFallback />}>
                            <ProtectedRoute><CardsPage /></ProtectedRoute>
                        </Suspense>
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
