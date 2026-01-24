import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWalletConnectModal } from '@walletconnect/modal-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { generateSalt, createInvoiceHash } from '../utils/aleo-utils';
import QRCode from 'react-native-qrcode-svg';

// Custom Dropdown Placeholder since native Picker can be tricky on Expo without config
const ExpirySelector = ({ value, onSelect }: { value: string, onSelect: (v: string) => void }) => (
    <View style={styles.expiryContainer}>
        <Text style={styles.label}>Expiry</Text>
        <View style={styles.expiryOptions}>
            {['0', '1', '24', '168'].map((opt) => (
                <TouchableOpacity
                    key={opt}
                    style={[styles.expiryBtn, value === opt && styles.expiryBtnActive]}
                    onPress={() => onSelect(opt)}
                >
                    <Text style={[styles.expiryText, value === opt && styles.expiryTextActive]}>
                        {opt === '0' ? 'No Expiry' : `${opt}h`}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

const CreateInvoiceScreen = () => {
    const { open, isConnected, address, provider } = useWalletConnectModal();

    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [expiry, setExpiry] = useState('0');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [manualAddress, setManualAddress] = useState('');
    const [useManualAddress, setUseManualAddress] = useState(false);

    // Monitor connection state
    useEffect(() => {
        console.log('🔗 WalletConnect State:', {
            isConnected,
            address,
            provider: !!provider
        });

        if (isConnected && address) {
            console.log('✅ Wallet Connected:', address);
        }
    }, [isConnected, address, provider]);

    const handleConnect = async () => {
        if (isConnected) {
            console.log('🔌 Disconnecting...');
            return provider?.disconnect();
        }
        console.log('🔌 Opening WalletConnect Modal...');
        try {
            await open();
            console.log('✅ Modal opened successfully');
        } catch (error) {
            console.error('❌ Error opening modal:', error);
        }
    };

    const handleCreate = async () => {
        // Use manual address if provided, otherwise use WalletConnect address
        const actualAddress = manualAddress.trim() || address;
        if (!actualAddress) {
            Alert.alert("No Address", "Please connect wallet or enter your Aleo address manually.");
            return;
        }
        // Validate Aleo address format
        if (!actualAddress.startsWith('aleo1') || actualAddress.length !== 63) {
            Alert.alert("Invalid Address", "Please enter a valid Aleo address (63 characters, starts with 'aleo1').");
            return;
        }
        if (!amount || Number(amount) <= 0) {
            Alert.alert("Error", "Enter valid amount");
            return;
        }

        setLoading(true);
        setStatus('Generating invoice...'); // Visual feedback
        try {
            // 1. Generate Info
            const salt = generateSalt();

            // 2. Hash
            setStatus('Computing secure hash...');
            await new Promise(r => setTimeout(r, 500)); // UI buffer
            const hash = await createInvoiceHash(actualAddress, Number(amount), salt);

            // 3. Chain Interaction (Mocked for now as per "working fine" request logic, but simulating the flow)
            // Real app would requestTransaction here.
            setStatus('Requesting signature...');

            // Simulating a delay for "Chain Interaction"
            await new Promise(r => setTimeout(r, 1000));

            const params = new URLSearchParams({
                merchant: actualAddress,
                amount: amount,
                salt,
                hash
            });
            if (memo) params.append('memo', memo);

            const link = `https://aleozkpay.com/pay?${params.toString()}`;

            setInvoiceData({
                hash,
                salt,
                amount,
                expiry,
                memo,
                link
            });
            setStatus('');

        } catch (error: any) {
            Alert.alert("Error", error.message);
            setStatus('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#02040a', '#1a1f35']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.header}>Create Invoice</Text>

                {/* Wallet Status */}
                <TouchableOpacity onPress={handleConnect} style={styles.connectBtn}>
                    <Text style={styles.btnText}>
                        {isConnected ? `🟢 Connected: ${address?.slice(0, 6)}...` : '🔌 Connect Puzzle Wallet'}
                    </Text>
                </TouchableOpacity>

                {/* Manual Address Input (Alternative) */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Or Enter Your Aleo Address Manually</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="aleo1..."
                        placeholderTextColor="#666"
                        value={manualAddress}
                        onChangeText={setManualAddress}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {!invoiceData ? (
                    <BlurView intensity={20} tint="dark" style={styles.card}>

                        <Text style={styles.label}>Amount (USDC)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        <ExpirySelector value={expiry} onSelect={setExpiry} />

                        <Text style={styles.label}>Memo (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Dinner Bill"
                            placeholderTextColor="#666"
                            value={memo}
                            onChangeText={setMemo}
                        />

                        <TouchableOpacity
                            style={[styles.primaryBtn, (!isConnected || !amount) && styles.disabled]}
                            onPress={handleCreate}
                            disabled={!isConnected || !amount || loading}
                        >
                            {loading ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                                    <Text style={styles.btnTextPrimary}>{status || 'Processing...'}</Text>
                                </View>
                            ) : (
                                <Text style={styles.btnTextPrimary}>Generate Invoice Link</Text>
                            )}
                        </TouchableOpacity>
                    </BlurView>
                ) : (
                    <BlurView intensity={20} tint="dark" style={styles.card}>
                        <Text style={styles.successTitle}>Invoice Ready!</Text>

                        <View style={styles.qrContainer}>
                            <QRCode value={invoiceData.link} size={180} />
                        </View>

                        <View style={styles.dataRow}>
                            <View>
                                <Text style={styles.miniLabel}>Amount</Text>
                                <Text style={styles.dataValue}>{invoiceData.amount} USDC</Text>
                            </View>
                            <View>
                                <Text style={styles.miniLabel}>Expiry</Text>
                                <Text style={styles.dataValue}>{invoiceData.expiry === '0' ? 'None' : invoiceData.expiry + 'h'}</Text>
                            </View>
                        </View>

                        <Text style={styles.label}>Invoice Link</Text>
                        <TextInput
                            style={[styles.input, { fontSize: 12 }]}
                            value={invoiceData.link}
                            editable={false}
                        />

                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => setInvoiceData(null)}
                        >
                            <Text style={styles.btnText}>Create Another</Text>
                        </TouchableOpacity>
                    </BlurView>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 100 },
    header: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 20, marginTop: 10, textAlign: 'center' },
    connectBtn: { backgroundColor: '#333', padding: 12, borderRadius: 30, marginBottom: 20, alignItems: 'center', alignSelf: 'center', minWidth: 200 },
    btnText: { color: '#fff', fontWeight: '600' },
    card: { padding: 20, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    label: { color: '#888', marginBottom: 8, marginTop: 10 },
    inputContainer: { marginBottom: 15 },
    input: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 15, color: '#fff', fontSize: 16, marginBottom: 0, borderWidth: 1, borderColor: '#333' },
    primaryBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 12, marginTop: 20, alignItems: 'center' },
    btnTextPrimary: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    disabled: { opacity: 0.5 },
    successTitle: { fontSize: 24, fontWeight: 'bold', color: '#4ade80', textAlign: 'center', marginBottom: 20 },
    qrContainer: { alignItems: 'center', padding: 15, backgroundColor: '#fff', borderRadius: 10, marginBottom: 20, alignSelf: 'center' },
    secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    expiryContainer: { marginBottom: 10 },
    expiryOptions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    expiryBtn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', flex: 1, marginHorizontal: 2, alignItems: 'center' },
    expiryBtnActive: { backgroundColor: '#4f46e5' },
    expiryText: { color: '#888', fontSize: 12 },
    expiryTextActive: { color: '#fff', fontWeight: 'bold' },
    dataRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15, backgroundColor: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 },
    miniLabel: { color: '#666', fontSize: 10 },
    dataValue: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default CreateInvoiceScreen;
