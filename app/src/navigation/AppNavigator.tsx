import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text } from 'react-native';
import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import PayInvoiceScreen from '../screens/PayInvoiceScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Simple Icon Placeholder since we might not have vector icons set up perfectly
const TabIcon = ({ focused, label }: { focused: boolean; label: string }) => (
    <View style={{ alignItems: 'center', opacity: focused ? 1 : 0.5 }}>
        <Text style={{ color: 'white', fontSize: 20 }}>
            {label === 'Create' ? '📄' : label === 'Pay' ? '💸' : '👤'}
        </Text>
        <Text style={{ color: 'white', fontSize: 10 }}>{label}</Text>
    </View>
);

const AppNavigator = ({ linking }: { linking?: any }) => {
    return (
        <NavigationContainer linking={linking}>
            <Tab.Navigator
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: '#000',
                        borderTopColor: '#333',
                        height: 80,
                        paddingTop: 10
                    },
                    tabBarShowLabel: false,
                }}
            >
                <Tab.Screen
                    name="CreateInvoice"
                    component={CreateInvoiceScreen}
                    options={{
                        tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Create" />
                    }}
                />
                <Tab.Screen
                    name="PayInvoice"
                    component={PayInvoiceScreen}
                    options={{
                        tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Pay" />
                    }}
                />
                <Tab.Screen
                    name="Profile"
                    component={ProfileScreen}
                    options={{
                        tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Profile" />
                    }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
