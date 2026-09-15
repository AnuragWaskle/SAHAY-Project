import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Home, PlusCircle, Award, User } from 'lucide-react-native';

import { AuthContext, UserProfile } from './src/context/AuthContext';
import FeedScreen from './src/screens/FeedScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ReportScreen from './src/screens/ReportScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import IncidentDetailScreen from './src/screens/IncidentDetailScreen';
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
        tabBarActiveTintColor: '#0051D5',
        tabBarInactiveTintColor: '#74777E',
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#E5EEFF', padding: 6, borderRadius: 12 } : { padding: 6 }}>
              <Home color={color} size={22} />
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
            <View style={focused ? { backgroundColor: '#E5EEFF', padding: 6, borderRadius: 12 } : { padding: 6 }}>
              <Award color={color} size={22} />
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
                backgroundColor: '#0051D5',
                width: 50,
                height: 50,
                borderRadius: 25,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -14,
                shadowColor: '#0051D5',
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
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#E5EEFF', padding: 6, borderRadius: 12 } : { padding: 6 }}>
              <User color={color} size={22} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [role, setRoleState] = useState<'citizen' | 'ngo' | 'super_admin'>('citizen');
  const [user, setUser] = useState<UserProfile>({
    id: 'user-1',
    name: 'Aryan',
    email: 'aryan@sahay.org',
    role: 'citizen',
    ward: 'Ward 12',
    city: 'Bhopal',
    xp: 1840,
    level: 7,
  });

  const handleLogin = async (email: string, pass: string, userRole?: 'citizen' | 'ngo') => {
    if (userRole) {
      setRoleState(userRole);
      setUser((prev) => ({ ...prev, role: userRole }));
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: 'sample-token',
        role,
        setRole: setRoleState,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}
