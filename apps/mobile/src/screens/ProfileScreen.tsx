import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Award, Star, ChevronRight, Shield, Bell, FileText, LogOut, Zap, Target, Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { logout } = useContext(AuthContext);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/users/me');
        setProfile(res.data.data);
      } catch (e: any) {
        console.error("Failed to load profile", e?.response?.status, e?.message);
        setProfile({
          name: 'Guest User',
          civic_impact_score: 0,
          level: 1,
          report_count: 0,
          resolved_count: 0,
          badge_type: 'none',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#FF7E67" />
        <Text className="mt-4 text-gray-500 font-medium">Loading profile...</Text>
      </View>
    );
  }

  const initials = profile?.name ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'U';

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]">
      {/* Curved Header with Avatar */}
      <View
        className="bg-brand-orange pt-16 pb-20 px-6 items-center relative"
        style={{
          borderBottomLeftRadius: 48,
          borderBottomRightRadius: 48,
          shadowColor: '#FF7E67',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        {/* Notification bell - top right */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          className="absolute top-14 right-6 w-10 h-10 bg-white/20 rounded-full items-center justify-center"
        >
          <Bell size={20} color="#FFF" />
        </TouchableOpacity>

        <Text className="text-white/70 font-bold text-sm uppercase tracking-widest mb-3">Your Profile</Text>
        <Text className="text-3xl font-black text-white tracking-tight">{profile?.name || 'Citizen'}</Text>
        <View className="flex-row items-center mt-2 bg-white/15 px-4 py-1.5 rounded-full">
          <Star size={14} color="#FFF" fill="#FFF" />
          <Text className="text-white font-bold ml-1.5 text-sm">Level {profile?.level || 1} Contributor</Text>
        </View>
      </View>

      {/* Overlapping Avatar */}
      <View className="items-center" style={{ marginTop: -44 }}>
        <View
          className="w-24 h-24 rounded-[28px] bg-white items-center justify-center"
          style={{
            elevation: 10,
            shadowColor: '#FF7E67',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
            borderWidth: 4,
            borderColor: '#FFF',
          }}
        >
          <Text className="text-3xl font-black text-brand-orange">{initials}</Text>
        </View>
        <View
          className="absolute bottom-0 right-1/2 mr-[-48px] bg-brand-orange w-7 h-7 rounded-full items-center justify-center"
          style={{ borderWidth: 2, borderColor: '#FFF' }}
        >
          <Award size={14} color="#FFF" />
        </View>
      </View>

      {/* Impact Wallet CTA */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ImpactWallet')}
        className="mx-5 mt-5 mb-2 bg-emerald-600 p-4 rounded-[22px] flex-row items-center"
        style={{ elevation: 6, shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }}
        activeOpacity={0.85}
      >
        <View className="w-11 h-11 rounded-2xl bg-white/20 items-center justify-center">
          <Wallet size={22} color="#FFF" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-black text-white text-base">Impact Wallet</Text>
          <Text className="text-white/70 font-medium text-xs">View credits, rewards & trust score</Text>
        </View>
        <View className="bg-white/20 px-3 py-1.5 rounded-xl">
          <Text className="text-white font-black text-xs">{profile?.civic_credits || 0} CC</Text>
        </View>
      </TouchableOpacity>

      {/* Stats Cards - Overlapping layout */}
      <View className="flex-row px-5 mt-4 mb-6">
        <TouchableOpacity
          onPress={() => navigation.navigate('ImpactWallet')}
          className="flex-1 bg-white p-5 rounded-[24px] mr-2 items-center"
          style={{
            elevation: 6,
            shadowColor: '#FF7E67',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            borderWidth: 1,
            borderColor: '#FFF0ED',
          }}
          activeOpacity={0.8}
        >
          <View className="w-10 h-10 rounded-2xl bg-orange-50 items-center justify-center mb-2">
            <Zap size={20} color="#FF7E67" />
          </View>
          <Text className="text-2xl font-black text-brand-orange">{profile?.civic_impact_score || 0}</Text>
          <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mt-1">Impact</Text>
        </TouchableOpacity>
        <View
          className="flex-1 bg-white p-5 rounded-[24px] mx-1 items-center"
          style={{
            elevation: 6,
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            borderWidth: 1,
            borderColor: '#EFF6FF',
          }}
        >
          <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center mb-2">
            <FileText size={20} color="#3B82F6" />
          </View>
          <Text className="text-2xl font-black text-blue-600">{profile?.report_count || 0}</Text>
          <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mt-1">Reports</Text>
        </View>
        <View
          className="flex-1 bg-white p-5 rounded-[24px] ml-2 items-center"
          style={{
            elevation: 6,
            shadowColor: '#16A34A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            borderWidth: 1,
            borderColor: '#F0FDF4',
          }}
        >
          <View className="w-10 h-10 rounded-2xl bg-green-50 items-center justify-center mb-2">
            <Target size={20} color="#16A34A" />
          </View>
          <Text className="text-2xl font-black text-green-600">{profile?.resolved_count || 0}</Text>
          <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mt-1">Resolved</Text>
        </View>
      </View>

      {/* Achievement Card */}
      <View className="px-5 mb-6">
        <View
          className="bg-white p-5 rounded-[28px] overflow-hidden"
          style={{
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
          }}
        >
          <View className="flex-row items-center mb-3">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest">Achievements</Text>
          </View>
          {profile?.badge_type && profile.badge_type !== 'none' ? (
            <View className="flex-row items-center bg-amber-50 p-4 rounded-2xl border border-amber-100">
              <View className="w-14 h-14 rounded-2xl bg-amber-100 items-center justify-center">
                <Star color="#F59E0B" size={28} fill="#F59E0B" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-black text-gray-900 text-base">Verified {profile.badge_type}</Text>
                <Text className="text-gray-500 text-xs font-medium mt-0.5">Active civic contributor</Text>
              </View>
            </View>
          ) : (
            <View className="bg-gray-50 p-4 rounded-2xl items-center border border-gray-100">
              <Text className="text-gray-400 font-bold text-sm">Keep reporting to unlock badges!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Account Menu with curved cards */}
      <View className="px-5 mb-32">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Account</Text>
        <View
          className="bg-white rounded-[28px] overflow-hidden"
          style={{
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 14,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('MyReports')}
            className="flex-row items-center p-5 border-b border-gray-50"
            activeOpacity={0.7}
          >
            <View className="w-11 h-11 rounded-2xl bg-orange-50 items-center justify-center">
              <FileText size={20} color="#FF7E67" />
            </View>
            <Text className="font-bold text-gray-800 text-base ml-4 flex-1">My Reports</Text>
            <ChevronRight size={18} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            className="flex-row items-center p-5 border-b border-gray-50"
            activeOpacity={0.7}
          >
            <View className="w-11 h-11 rounded-2xl bg-purple-50 items-center justify-center">
              <Bell size={20} color="#8B5CF6" />
            </View>
            <Text className="font-bold text-gray-800 text-base ml-4 flex-1">Notifications</Text>
            <ChevronRight size={18} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            className="flex-row items-center p-5 border-b border-gray-50"
            activeOpacity={0.7}
          >
            <View className="w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center">
              <Shield size={20} color="#3B82F6" />
            </View>
            <Text className="font-bold text-gray-800 text-base ml-4 flex-1">Account Security</Text>
            <ChevronRight size={18} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={logout}
            className="flex-row items-center p-5"
            activeOpacity={0.7}
          >
            <View className="w-11 h-11 rounded-2xl bg-red-50 items-center justify-center">
              <LogOut size={20} color="#EF4444" />
            </View>
            <Text className="font-bold text-red-600 text-base ml-4 flex-1">Sign Out</Text>
            <ChevronRight size={18} color="#FECACA" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
