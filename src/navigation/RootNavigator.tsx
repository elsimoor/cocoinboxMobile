import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, Linking } from 'react-native';
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
import UpgradeScreen from '@/screens/UpgradeScreen';
import UpgradeWebViewScreen from '@/screens/UpgradeWebViewScreen';
import { useIsPro } from '@/hooks/useIsPro';

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

function AppTabs({ isPro }: { isPro: boolean }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f172a',
        tabBarStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: tabIcon('speedometer-outline') }} />
      {isPro && (
        <>
          <Tab.Screen name="Emails" component={EmailsScreen} options={{ tabBarIcon: tabIcon('mail-outline') }} />
          <Tab.Screen name="SMS" component={SmsScreen} options={{ tabBarIcon: tabIcon('chatbubbles-outline') }} />
        </>
      )}
      {!isPro && (
        <Tab.Screen name="Upgrade" component={UpgradeScreen} options={{ tabBarIcon: tabIcon('arrow-up-circle-outline') }} />
      )}
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon('settings-outline') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading, refreshUser } = useAuth();
  const { isPro } = useIsPro();
  const navRef = useRef<any>(null);

  useEffect(() => {
    const sub = Linking.addEventListener('url', async ({ url }) => {
      if (url.startsWith('cocoinbox://upgrade-success')) {
        await refreshUser();
        navRef.current?.navigate('Dashboard');
      }
    });
    return () => sub.remove();
  }, [refreshUser]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={THEME} ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="AppTabs" children={() => <AppTabs isPro={isPro} />} />
            {!isPro && (
              <Stack.Screen name="UpgradeWeb" component={UpgradeWebViewScreen} options={{ headerShown: true, title: 'Upgrade' }} />
            )}
            <Stack.Screen
              name="EmailDetail"
              component={EmailDetailScreen}
              options={{ headerShown: true, title: 'Mailbox' }}
            />
            {isPro && (
              <>
                <Stack.Screen name="Files" component={FilesScreen} options={{ headerShown: true, title: 'Secure Files' }} />
                <Stack.Screen name="Notes" component={NotesScreen} options={{ headerShown: true, title: 'Secure Notes' }} />
                <Stack.Screen name="Esim" component={EsimScreen} options={{ headerShown: true, title: 'Travel eSIM' }} />
                <Stack.Screen name="Data" component={DataScreen} options={{ headerShown: true, title: 'Workspace Data' }} />
              </>
            )}
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
