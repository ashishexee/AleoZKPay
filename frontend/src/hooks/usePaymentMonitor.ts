import { useEffect } from 'react';
import { io } from "socket.io-client";
import toast from 'react-hot-toast';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const API_URL = 'http://localhost:3000';

export const usePaymentMonitor = () => {
    const { address: publicKey } = useWallet();

    useEffect(() => {
        // Connect to the Socket.IO server - ensuring it connects to the base URL, not /api
        // API_URL might be http://localhost:3000/api or http://localhost:3000
        // We need the base origin for socket.io
        const socketUrl = new URL(API_URL).origin;

        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log('✅ Connected to payment monitor socket', socket.id);
        });

        socket.on('payment_received', (data: any) => {
            console.log('📩 [PaymentMonitor] Event Received:', data);

            // Debugging address matching
            console.log(`Address Check: Wallet '${publicKey}' vs Data '${data.merchantAddress}'`);

            // Filter notifications for the current user (if logged in as merchant)
            if (publicKey && data.merchantAddress === publicKey) {
                console.log('🔔 Triggering Notification!');
                if (data.status === 'SETTLED') {
                    toast.success(`Invoice ${data.invoiceHash.slice(0, 6)}... settled!`, {
                        duration: 5000,
                        position: 'top-right',
                    });
                } else {
                    toast.success(`Payment received for invoice ${data.invoiceHash.slice(0, 6)}...`, {
                        duration: 5000,
                        position: 'top-right',
                    });
                }
            } else {
                console.log('❌ Notification skipped: Address mismatch or wallet not connected.');
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [publicKey]);
};
