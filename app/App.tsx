import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import AppNavigator from './src/navigation/AppNavigator';
import { WalletConnectModal, useWalletConnectModal } from '@walletconnect/modal-react-native';
import { providerMetadata, projectId, sessionParams } from './src/utils/wallet-connect-config';

const prefix = Linking.createURL('/');

export default function App() {
  const linking = {
    prefixes: [prefix, 'aleozkpay://'],
    config: {
      screens: {
        CreateInvoice: 'create',
        PayInvoice: 'pay',
        Profile: 'profile',
      },
    },
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <AppNavigator linking={linking} />
        <StatusBar style="light" />
        <WalletConnectModal
          projectId={projectId}
          providerMetadata={providerMetadata}
          sessionParams={sessionParams}
          relayUrl="wss://relay.walletconnect.com"
          onCopyClipboard={(value: string) => {
            console.log('📋 Copied to clipboard:', value);
          }}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
