import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { Shield, Zap, Users, ChevronRight } from 'lucide-react-native';
import apiClient, { setAuthToken } from '../api/client';

const { width } = Dimensions.get('window');

const DEMO_ACCOUNTS = [
  { label: 'Citizen', token: 'demo_citizen_001', desc: 'Report issues, track progress', icon: Users, color: '#FF7E67' },
  { label: 'Officer', token: 'demo_officer_001', desc: 'Manage & resolve incidents', icon: Shield, color: '#3B82F6' },
  { label: 'NGO Admin', token: 'demo_ngo_001', desc: 'Run initiatives, verify', icon: Zap, color: '#8B5CF6' },
  { label: 'Platform Admin', token: 'demo_admin_001', desc: 'Full platform control', icon: Shield, color: '#059669' },
];

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loginWithToken = async (token: string) => {
    setLoading(true);
    setError('');
    try {
      setAuthToken(token);
      const res = await apiClient.get('/users/me');
      if (res.data?.success) {
        onLogin();
      } else {
        setError('Login failed. Server not reachable.');
        setAuthToken(null);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid credentials.');
      } else {
        setAuthToken(token);
        onLogin();
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = () => {
    if (phone.length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    loginWithToken(`demo_phone_${phone}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#F5F7FA]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Curved Header */}
        <View
          className="bg-brand-orange pt-20 pb-16 px-8 items-center"
          style={{
            borderBottomLeftRadius: 48,
            borderBottomRightRadius: 48,
            shadowColor: '#FF7E67',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 12,
          }}
        >
          <View
            className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-5"
            style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' }}
          >
            <Text className="text-5xl font-black text-white">S</Text>
          </View>
          <Text className="text-4xl font-black text-white tracking-tight">Sahay</Text>
          <Text className="text-white/80 font-semibold text-base mt-1">Civic Participation Platform</Text>
        </View>

        {/* Overlapping Phone Login Card */}
        <View
          className="mx-6 bg-white p-6 rounded-[28px] border border-gray-100"
          style={{
            marginTop: -32,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
          }}
        >
          <Text className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Phone Login</Text>
          <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-1 border border-gray-200">
            <View className="bg-brand-orange/10 px-3 py-2 rounded-xl mr-3">
              <Text className="text-brand-orange font-black text-sm">+91</Text>
            </View>
            <TextInput
              className="flex-1 py-4 text-lg font-semibold text-gray-800"
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <TouchableOpacity
            onPress={handlePhoneLogin}
            disabled={loading}
            className="mt-4 bg-brand-orange py-4 rounded-2xl items-center"
            style={{
              shadowColor: '#FF7E67',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-black text-lg tracking-wide">Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View className="mx-6 mt-4 bg-red-50 p-4 rounded-2xl border border-red-200">
            <Text className="text-red-600 text-center font-bold">{error}</Text>
          </View>
        ) : null}

        {/* Demo Accounts Section */}
        <View className="px-6 mt-8 mb-10">
          <View className="flex-row items-center mb-5">
            <View className="flex-1 h-[1px] bg-gray-200" />
            <Text className="mx-4 text-xs font-black text-gray-400 uppercase tracking-widest">Quick Demo</Text>
            <View className="flex-1 h-[1px] bg-gray-200" />
          </View>

          {DEMO_ACCOUNTS.map((acc, index) => {
            const Icon = acc.icon;
            return (
              <TouchableOpacity
                key={acc.token}
                onPress={() => loginWithToken(acc.token)}
                disabled={loading}
                className="bg-white p-4 rounded-[22px] mb-3 flex-row items-center border border-gray-100"
                style={{
                  elevation: 4,
                  shadowColor: acc.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  marginLeft: index % 2 === 0 ? 0 : 8,
                  marginRight: index % 2 === 0 ? 8 : 0,
                }}
              >
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                  style={{ backgroundColor: `${acc.color}15` }}
                >
                  <Icon size={22} color={acc.color} />
                </View>
                <View className="flex-1">
                  <Text className="font-black text-gray-900 text-base">{acc.label}</Text>
                  <Text className="text-gray-500 text-xs font-medium mt-0.5">{acc.desc}</Text>
                </View>
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${acc.color}15` }}
                >
                  <ChevronRight size={16} color={acc.color} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
