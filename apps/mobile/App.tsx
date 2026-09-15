import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { Home, PlusCircle, User, Compass, Target } from 'lucide-react-native';

import { AuthContext } from './src/context/AuthContext';
import './src/global.css';
import './src/i18n/config';

import HomeScreen from './src/screens/HomeScreen';
import FeedScreen from './src/screens/FeedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportScreen from './src/screens/ReportScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import ActScreen from './src/screens/ActScreen';
import LoginScreen from './src/screens/LoginScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import MyReportsScreen from './src/screens/MyReportsScreen';
import VerifyScreen from './src/screens/VerifyScreen';
import IncidentDetailScreen from './src/screens/IncidentDetailScreen';
import DemandDetailScreen from './src/screens/DemandDetailScreen';
import InitiativeDetailScreen from './src/screens/InitiativeDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ImpactWalletScreen from './src/screens/ImpactWalletScreen';
import RewardMarketplaceScreen from './src/screens/RewardMarketplaceScreen';
import MissionDetailScreen from './src/screens/MissionDetailScreen';
import CirclesScreen from './src/screens/CirclesScreen';
import { setAuthToken } from './src/api/client';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', borderRadius: 28 }]} />
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          left: 16,
          right: 16,
          elevation: 12,
          borderRadius: 28,
          height: 72,
          borderWidth: 0,
          backgroundColor: 'transparent',
          shadowColor: '#1E293B',
          shadowOpacity: 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -6 },
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: -2, letterSpacing: 0.3 },
        tabBarActiveTintColor: '#FF7E67',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarItemStyle: { paddingTop: 8 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#FFF0ED', padding: 8, borderRadius: 14 } : { padding: 8 }}>
              <Home color={color} size={22} />
            </View>
          )
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#FFF0ED', padding: 8, borderRadius: 14 } : { padding: 8 }}>
              <Compass color={color} size={22} />
            </View>
          )
        }}
      />
      <Tab.Screen
        name="Create"
        component={ReportScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={{
              backgroundColor: '#FF7E67',
              width: 52,
              height: 52,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: -16,
              shadowColor: '#FF7E67',
              shadowOpacity: 0.45,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
              borderWidth: 4,
              borderColor: '#FFF',
            }}>
              <PlusCircle color="white" size={26} />
            </View>
          )
        }}
      />
      <Tab.Screen
        name="Act"
        component={ActScreen}
        options={{
          tabBarLabel: 'Act',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#FFF0ED', padding: 8, borderRadius: 14 } : { padding: 8 }}>
              <Target color={color} size={22} />
            </View>
          )
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#FFF0ED', padding: 8, borderRadius: 14 } : { padding: 8 }}>
              <User color={color} size={22} />
            </View>
          )
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = () => {
    setAuthToken(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ logout: handleLogout }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {!isLoggedIn ? (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login">
                {() => <LoginScreen onLogin={() => setIsLoggedIn(true)} />}
              </Stack.Screen>
            </Stack.Navigator>
          ) : (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ headerShown: true, title: 'Notifications', headerTintColor: '#FF7E67' }}
              />
              <Stack.Screen
                name="MyReports"
                component={MyReportsScreen}
                options={{ headerShown: true, title: 'My Reports', headerTintColor: '#FF7E67' }}
              />
              <Stack.Screen
                name="Verify"
                component={VerifyScreen}
                options={{ headerShown: true, title: 'Verify Resolutions', headerTintColor: '#FF7E67' }}
              />
              <Stack.Screen
                name="IncidentDetail"
                component={IncidentDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="DemandDetail"
                component={DemandDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="InitiativeDetail"
                component={InitiativeDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Feed"
                component={FeedScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ImpactWallet"
                component={ImpactWalletScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RewardMarketplace"
                component={RewardMarketplaceScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MissionDetail"
                component={MissionDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Circles"
                component={CirclesScreen}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}
