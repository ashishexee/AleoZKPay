import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const ProfileScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#000', '#111']} style={StyleSheet.absoluteFill} />
            <Text style={styles.text}>Profile (Placeholder)</Text>
            <Text style={styles.subtext}>Merchant Dashboard Coming Soon</Text>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    subtext: { color: '#888', marginTop: 10 }
});

export default ProfileScreen;
