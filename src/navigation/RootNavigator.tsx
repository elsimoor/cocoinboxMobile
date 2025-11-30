import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import WelcomeScreen from '@/screens/Auth/WelcomeScreen';
import LoginScreen from '@/screens/Auth/LoginScreen';
import RegisterScreen from '@/screens/Auth/RegisterScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import EmailsScreen from '@/screens/Emails/EmailsScreen';
import EmailDetailScreen from '@/screens/Emails/EmailDetailScreen';
import FilesScreen from '@/screens/Files/FilesScreen';
import NotesScreen from '@/screens/NotesScreen';
import EsimScreen from '@/screens/EsimScreen';
import DataScreen from '@/screens/DataScreen';
import SmsScreen from '@/screens/Sms/SmsScreen';
import SettingsScreen from '@/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabIcon = (name: React.ComponentProps<typeof Ionicons>['name']) => ({
  color,
  size,
}: {
  color: string;
  size: number;
}) => <Ionicons name={name} color={color} size={size} />;

const THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f4f4f5',
  },
};

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f172a',
        tabBarStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: tabIcon('speedometer-outline') }} />
      <Tab.Screen name="Emails" component={EmailsScreen} options={{ tabBarIcon: tabIcon('mail-outline') }} />
      <Tab.Screen name="SMS" component={SmsScreen} options={{ tabBarIcon: tabIcon('chatbubbles-outline') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon('settings-outline') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={THEME}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="AppTabs" component={AppTabs} />
            <Stack.Screen
              name="EmailDetail"
              component={EmailDetailScreen}
              options={{ headerShown: true, title: 'Mailbox' }}
            />
            <Stack.Screen name="Files" component={FilesScreen} options={{ headerShown: true, title: 'Secure Files' }} />
            <Stack.Screen name="Notes" component={NotesScreen} options={{ headerShown: true, title: 'Secure Notes' }} />
            <Stack.Screen name="Esim" component={EsimScreen} options={{ headerShown: true, title: 'Travel eSIM' }} />
            <Stack.Screen name="Data" component={DataScreen} options={{ headerShown: true, title: 'Workspace Data' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
