import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { Home, Compass, PlusCircle, Award, User } from 'lucide-react-native';

import { AuthContext, UserProfile } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';

import FeedScreen from './src/screens/FeedScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ReportScreen from './src/screens/ReportScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import IncidentDetailScreen from './src/screens/IncidentDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import { setAuthToken } from './src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      id="mainTab"
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', borderRadius: 28 }]} />
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          elevation: 10,
          borderRadius: 28,
          height: 68,
          borderWidth: 0,
          backgroundColor: 'transparent',
          shadowColor: '#102A43',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: -2 },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#64748B',
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#F3E8FF', padding: 6, borderRadius: 12 } : { padding: 6 }}>
              <Home color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#F3E8FF', padding: 6, borderRadius: 12 } : { padding: 6 }}>
              <Compass color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View
              style={{
                backgroundColor: '#7C3AED',
                width: 50,
                height: 50,
                borderRadius: 25,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -14,
                shadowColor: '#7C3AED',
                shadowOpacity: 0.4,
                shadowRadius: 10,
                elevation: 6,
                borderWidth: 3,
                borderColor: '#FFF',
              }}
            >
              <PlusCircle color="#FFF" size={26} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Ranks"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Ranks',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#F3E8FF', padding: 6, borderRadius: 12 } : { padding: 6 }}>
              <Award color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#F3E8FF', padding: 6, borderRadius: 12 } : { padding: 6 }}>
              <User color={color} size={22} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator id="authStack" screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator id="rootStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [role, setRoleState] = useState<'citizen' | 'ngo' | 'super_admin'>('citizen');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  React.useEffect(() => {
    // Only set the token if we actually have one from a login
    // Do NOT fall back to a hardcoded demo token — that causes all reports
    // to be submitted under the same shared account.
    setAuthToken(token);
  }, [token]);

  const handleLogin = async (userData: UserProfile, authToken?: string) => {
    // Use the provided token, or generate a stable unique token per user
    const activeToken = authToken || `token_${userData.id || Date.now()}`;
    setUser(userData);
    setToken(activeToken);
    setRoleState(userData.role);
    setAuthToken(activeToken);
  };

  const handleLogout = async () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    try {
      await AsyncStorage.multiRemove(['@saved_posts', '@user_avatar']);
    } catch (e) {
      console.warn('Failed to clear AsyncStorage on logout', e);
    }
  };

  const activeRole = user?.role ? user.role : role;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: activeRole,
        setRole: setRoleState,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      <SafeAreaProvider>
        <NavigationContainer>
          {user && token ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}
