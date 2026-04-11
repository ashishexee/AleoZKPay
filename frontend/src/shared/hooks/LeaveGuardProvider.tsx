import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

type GuardState = {
    active: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    cancelLabel: string;
};

type LeaveGuardContextValue = {
    guard: GuardState;
    setGuard: (next: Partial<GuardState> & { active: boolean }) => void;
    clearGuard: () => void;
};

const defaultGuard: GuardState = {
    active: false,
    title: 'Wait For Sync',
    message: 'A transaction is still syncing. Leaving now may interrupt the flow before NullPay finishes confirming the result.',
    confirmLabel: 'Leave Anyway',
    cancelLabel: 'Stay'
};

const LeaveGuardContext = createContext<LeaveGuardContextValue | null>(null);

export const LeaveGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [guard, setGuardState] = useState<GuardState>(defaultGuard);
    const [showModal, setShowModal] = useState(false);
    const [pendingPath, setPendingPath] = useState<string | null>(null);
    const guardRef = useRef(guard);

    useEffect(() => {
        guardRef.current = guard;
    }, [guard]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!guardRef.current.active) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (!guardRef.current.active) return;
            if (event.defaultPrevented) return;
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const target = event.target as HTMLElement | null;
            const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
            if (!anchor) return;
            if (anchor.target && anchor.target !== '_self') return;
            if (anchor.hasAttribute('download')) return;

            const url = new URL(anchor.href, window.location.href);
            if (url.origin !== window.location.origin) return;

            const nextPath = `${url.pathname}${url.search}${url.hash}`;
            const currentPath = `${location.pathname}${location.search}${location.hash}`;
            if (nextPath === currentPath) return;

            event.preventDefault();
            setPendingPath(nextPath);
            setShowModal(true);
        };

        document.addEventListener('click', handleDocumentClick, true);
        return () => document.removeEventListener('click', handleDocumentClick, true);
    }, [location.pathname, location.search, location.hash]);

    const value = useMemo<LeaveGuardContextValue>(() => ({
        guard,
        setGuard: (next) => {
            setGuardState((current) => ({
                ...current,
                ...next,
                title: next.title || current.title || defaultGuard.title,
                message: next.message || current.message || defaultGuard.message,
                confirmLabel: next.confirmLabel || current.confirmLabel || defaultGuard.confirmLabel,
                cancelLabel: next.cancelLabel || current.cancelLabel || defaultGuard.cancelLabel
            }));
        },
        clearGuard: () => {
            setGuardState(defaultGuard);
        }
    }), [guard]);

    return (
        <LeaveGuardContext.Provider value={value}>
            {children}
            <ConfirmModal
                open={showModal}
                tone="danger"
                title={guard.title}
                description={guard.message}
                confirmLabel={guard.confirmLabel}
                cancelLabel={guard.cancelLabel}
                onConfirm={() => {
                    setShowModal(false);
                    const nextPath = pendingPath;
                    setPendingPath(null);
                    if (nextPath) {
                        navigate(nextPath);
                    }
                }}
                onClose={() => {
                    setShowModal(false);
                    setPendingPath(null);
                }}
            />
        </LeaveGuardContext.Provider>
    );
};

export const useLeaveGuard = () => {
    const context = useContext(LeaveGuardContext);
    if (!context) {
        throw new Error('useLeaveGuard must be used within a LeaveGuardProvider');
    }
    return context;
};
