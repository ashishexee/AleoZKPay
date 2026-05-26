import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Home from '../desktop/pages/home';
import { ProtectedRoute } from '../shared/components/routing/ProtectedRoute';
import { useShieldAvailability } from '../shared/hooks/wallet/useShieldAvailability';

const CreateInvoice = lazy(() => import('./pages/createinvoice'));
const PaymentPage = lazy(() => import('./pages/payment'));
const Profile = lazy(() => import('../shared/pages/profile'));
const CheckoutPage = lazy(() => import('../shared/pages/checkout'));
const InvoiceDetails = lazy(() => import('../shared/pages/invoicedetails'));
const GiftCardsPage = lazy(() => import('../shared/pages/giftcards'));
const TelegramLinkPage = lazy(() => import('../shared/pages/telegramlink'));
const TelegramBotPage = lazy(() => import('../shared/pages/telegrambot'));
const AuditVerifyPage = lazy(() => import('../shared/pages/auditverify'));
const SupportFeedbackPage = lazy(() => import('../shared/pages/supportfeedback'));

const RouteFallback = () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
);

const MobileAnimatedRoutes = ({ shouldShowDashboard }: { shouldShowDashboard: boolean }) => {
    const location = useLocation();
    const routeKey = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile') ? '/dashboard' : location.pathname;

    return (
        <AnimatePresence mode="wait">
            <Suspense fallback={<RouteFallback />}>
                <Routes location={location} key={routeKey}>
                    {shouldShowDashboard ? (
                        <>
                            <Route path="/" element={<Navigate to="/create" replace />} />
                            <Route path="/create" element={<ProtectedRoute><CreateInvoice /></ProtectedRoute>} />
                            <Route path="/pay" element={<PaymentPage />} />
                            <Route path="/giftcards" element={<ProtectedRoute><GiftCardsPage /></ProtectedRoute>} />
                            <Route path="/dashboard/*" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                            <Route path="/profile/*" element={<Navigate to="/dashboard" replace />} />
                        </>
                    ) : (
                        <Route path="/" element={<Home />} />
                    )}
                    <Route path="/telegram-bot" element={<TelegramBotPage />} />
                    <Route path="/telegram/link" element={<TelegramLinkPage />} />
                    <Route path="/audit/verify" element={<AuditVerifyPage />} />
                    <Route path="/checkout/:id" element={<CheckoutPage />} />
                    <Route path="/invoice/:hash" element={<InvoiceDetails />} />
                    <Route path="/support-feedback" element={<ProtectedRoute><SupportFeedbackPage /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to={shouldShowDashboard ? '/create' : '/'} replace />} />
                </Routes>
            </Suspense>
        </AnimatePresence>
    );
};

export const MobileApp = () => {
    const { shouldShowMobileDashboard } = useShieldAvailability();

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {shouldShowMobileDashboard && (
                <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                    <img
                        src="/assets/aleo_globe.png"
                        alt="Aleo Globe"
                        className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                        style={{
                            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                        }}
                    />
                </div>
            )}

            {shouldShowMobileDashboard && <Navbar />}

            <main className={shouldShowMobileDashboard ? 'relative z-10 pt-24 px-4 pb-32 md:pb-12' : 'relative z-10'}>
                <MobileAnimatedRoutes shouldShowDashboard={shouldShowMobileDashboard} />
            </main>
        </div>
    );
};
