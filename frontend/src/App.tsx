import { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster, ToastBar } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle } from 'lucide-react';
import { usePaymentMonitor } from './shared/hooks/app/usePaymentMonitor';
import { LeaveGuardProvider } from './shared/hooks/app/LeaveGuardProvider';
import './index.css';

const MobileApp = lazy(() => import('./mobile/MobileApp').then(module => ({ default: module.MobileApp })));
import DesktopApp from './desktop/DesktopApp';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

function App() {
    usePaymentMonitor();
    const isMobile = useIsMobile();
    return (
        <Router>
            <LeaveGuardProvider>
                <Toaster position="bottom-center" containerStyle={{ bottom: 40 }}>
                    {(t) => (
                        <AnimatePresence mode="popLayout">
                            {t.visible && (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                    transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                                    className="pointer-events-auto"
                                >
                                    <ToastBar 
                                        toast={t}
                                        style={{
                                            ...t.style,
                                            background: 'rgba(10, 10, 10, 0.92)',
                                            color: '#fff',
                                            border: '1px solid rgba(251, 146, 60, 0.24)',
                                            borderRadius: '24px',
                                            fontSize: '15.5px',
                                            fontWeight: '500',
                                            boxShadow: '0 28px 72px -12px rgba(0, 0, 0, 0.8)',
                                            whiteSpace: 'nowrap',
                                            maxWidth: 'none',
                                            padding: '12px 32px',
                                            backdropFilter: 'blur(20px)',
                                        }}
                                    >
                                        {({ icon, message }: any) => (
                                            <div className="flex items-center gap-3.5">
                                                {t.type === 'success' ? (
                                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/10 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
                                                        <Check className="h-3.5 w-3.5 text-orange-400 stroke-[3]" />
                                                    </div>
                                                ) : t.type === 'error' ? (
                                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                                ) : (
                                                    icon
                                                )}
                                                <div className="tracking-tight text-white/95">{message}</div>
                                            </div>
                                        )}
                                    </ToastBar>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </Toaster>
                <Suspense fallback={
                    <div className="min-h-screen bg-black flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                }>
                    {isMobile ? <MobileApp /> : <DesktopApp />}
                </Suspense>
            </LeaveGuardProvider>
        </Router>
    );
}

export default App;
