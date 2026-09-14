import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { MapPin, TrendingUp, Users, FileText, AlertTriangle, ChevronRight, Zap, Shield, Droplets, Trash2, Lightbulb, Car } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../api/client';

const CITY_ID = '00000000-0000-0000-0000-000000000001';

const CATEGORY_ICONS: Record<string, any> = {
  cleanliness: Trash2,
  roads: Car,
  water: Droplets,
  safety: Shield,
  streetlight: Lightbulb,
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [cityData, setCityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [homeRes, prioritiesRes] = await Promise.all([
        apiClient.get(`/city/${CITY_ID}/home`).catch(() => ({ data: { data: null } })),
        apiClient.get(`/city/${CITY_ID}/priorities`).catch(() => ({ data: { data: [] } })),
      ]);

      const home = homeRes.data?.data;
      const priorities = prioritiesRes.data?.data || [];

      if (home) {
        setCityData({
          score: home.city_score?.score || null,
          subScores: home.city_score?.sub_scores || {},
          activeIncidents: parseInt(home.incidents?.active || '0'),
          resolvedIncidents: parseInt(home.incidents?.resolved || '0'),
          totalReports: home.total_reports || 0,
          activeCitizens: home.active_citizens || 0,
          priorities: priorities.slice(0, 5),
        });
      } else {
        setCityData({ score: null, subScores: {}, activeIncidents: 0, resolvedIncidents: 0, totalReports: 0, activeCitizens: 0, priorities: [] });
      }
    } catch (err) {
      console.error('Failed to fetch city data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [sosTriggering, setSosTriggering] = useState(false);

  const handleSOS = () => {
    Alert.alert(
      '🚨 TRIGGER EMERGENCY SOS 🚨',
      'This will immediately report a critical civic hazard at your current location to dispatch response teams. Confirm?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CONFIRM EMERGENCY',
          style: 'destructive',
          onPress: async () => {
            setSosTriggering(true);
            try {
              await apiClient.post('/incidents', {
                title: 'EMERGENCY ALERT: Resident SOS Triggered',
                description: 'A priority resident emergency SOS was broadcasted via the Sahay mobile app.',
                category: 'safety',
                severity: 'CRITICAL',
                latitude: 23.2599,
                longitude: 77.4126,
              });
              Alert.alert('SOS Dispatched 🔴', 'Emergency incident successfully registered. City response teams are on alert!');
            } catch (err) {
              Alert.alert('Error', 'Failed to dispatch SOS alert. Please try calling helpline directly.');
            } finally {
              setSosTriggering(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#FF7E67" />
        <Text className="mt-4 text-gray-500 font-medium">Loading your city...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <ScrollView
        className="flex-1 bg-[#F5F7FA]"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#FF7E67" />}
      >
      {/* City Score Header */}
      <View
        className="bg-brand-orange pt-16 pb-20 px-6"
        style={{
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          shadowColor: '#FF7E67',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-white/70 font-bold text-xs uppercase tracking-widest">Your City</Text>
            <Text className="text-3xl font-black text-white tracking-tight">Bhopal</Text>
          </View>
          <View className="bg-white/20 px-4 py-2 rounded-2xl">
            <Text className="text-white font-black text-xs">LIVE</Text>
          </View>
        </View>

        {/* City Score Circle */}
        <View className="items-center mt-2">
          <View
            className="w-28 h-28 rounded-full bg-white/20 items-center justify-center"
            style={{ borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' }}
          >
            <Text className="text-4xl font-black text-white">
              {cityData?.score ? Math.round(Number(cityData.score)) : '--'}
            </Text>
            <Text className="text-white/70 font-bold text-[10px] uppercase tracking-wider">City Score</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View className="flex-row px-5 mt-[-24px]">
        <View
          className="flex-1 bg-white p-4 rounded-[20px] mr-2 items-center"
          style={{ elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 }}
        >
          <Text className="text-xl font-black text-brand-orange">{cityData?.totalReports || 0}</Text>
          <Text className="text-gray-400 font-bold text-[9px] uppercase tracking-wider mt-1">Reports</Text>
        </View>
        <View
          className="flex-1 bg-white p-4 rounded-[20px] mx-1 items-center"
          style={{ elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 }}
        >
          <Text className="text-xl font-black text-blue-600">{cityData?.activeCitizens || 0}</Text>
          <Text className="text-gray-400 font-bold text-[9px] uppercase tracking-wider mt-1">Citizens</Text>
        </View>
        <View
          className="flex-1 bg-white p-4 rounded-[20px] ml-2 items-center"
          style={{ elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 }}
        >
          <Text className="text-xl font-black text-green-600">{cityData?.resolvedIncidents || 0}</Text>
          <Text className="text-gray-400 font-bold text-[9px] uppercase tracking-wider mt-1">Resolved</Text>
        </View>
      </View>

      {/* Sub-Scores */}
      {cityData?.subScores && Object.keys(cityData.subScores).length > 0 && (
        <View className="px-5 mt-6">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">City Health</Text>
          <View
            className="bg-white p-5 rounded-[24px]"
            style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 }}
          >
            {Object.entries(cityData.subScores).map(([key, value]: [string, any]) => {
              const score = Number(value) || 0;
              const Icon = CATEGORY_ICONS[key] || TrendingUp;
              return (
                <View key={key} className="flex-row items-center mb-3 last:mb-0">
                  <View className="w-8 h-8 rounded-xl bg-orange-50 items-center justify-center mr-3">
                    <Icon size={14} color="#FF7E67" />
                  </View>
                  <Text className="flex-1 font-bold text-gray-700 text-sm capitalize">{key}</Text>
                  <View className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden mx-3">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(score, 100)}%`,
                        backgroundColor: score >= 70 ? '#16A34A' : score >= 40 ? '#F59E0B' : '#DC2626',
                      }}
                    />
                  </View>
                  <Text className="font-black text-gray-800 text-sm w-8 text-right">{Math.round(score)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Active Issues */}
      <View className="px-5 mt-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Top Priorities</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
            <Text className="text-brand-orange font-bold text-xs">See All</Text>
          </TouchableOpacity>
        </View>

        {(!cityData?.priorities || cityData.priorities.length === 0) ? (
          <View className="bg-white p-6 rounded-[24px] items-center" style={{ elevation: 3 }}>
            <AlertTriangle size={32} color="#CBD5E1" />
            <Text className="text-gray-400 font-bold text-sm mt-3">No active priorities</Text>
            <Text className="text-gray-300 font-medium text-xs mt-1">Your city is doing well!</Text>
          </View>
        ) : (
          cityData.priorities.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => navigation.navigate('IncidentDetail', { incidentId: item.id })}
              className="bg-white p-4 rounded-[20px] mb-3 flex-row items-center"
              style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}
            >
              <View className="w-10 h-10 rounded-2xl bg-red-50 items-center justify-center mr-3">
                <AlertTriangle size={18} color="#DC2626" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-gray-800 text-sm" numberOfLines={1}>{item.title}</Text>
                <View className="flex-row items-center mt-1">
                  <Text className="text-gray-400 text-xs font-medium">{item.category}</Text>
                  <View className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
                  <Text className="text-gray-400 text-xs font-medium">{item.report_count} reports</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="font-black text-brand-orange text-sm">{Math.round(Number(item.priority_score))}</Text>
                <Text className="text-gray-300 text-[9px] font-bold">score</Text>
              </View>
              <ChevronRight size={16} color="#D1D5DB" className="ml-2" />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View className="px-5 mt-6 mb-32">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Quick Actions</Text>
        <View className="flex-row mb-3">
          <TouchableOpacity
            onPress={() => navigation.navigate('Create')}
            className="flex-1 bg-white p-5 rounded-[22px] mr-2 items-center"
            style={{ elevation: 4, shadowColor: '#FF7E67', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }}
          >
            <View className="w-12 h-12 rounded-2xl bg-orange-50 items-center justify-center mb-2">
              <FileText size={22} color="#FF7E67" />
            </View>
            <Text className="font-bold text-gray-700 text-xs">Report Issue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Explore')}
            className="flex-1 bg-white p-5 rounded-[22px] ml-2 items-center"
            style={{ elevation: 4, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }}
          >
            <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mb-2">
              <MapPin size={22} color="#3B82F6" />
            </View>
            <Text className="font-bold text-gray-700 text-xs">Explore Map</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => navigation.navigate('Act')}
            className="flex-1 bg-white p-5 rounded-[22px] mr-2 items-center"
            style={{ elevation: 4, shadowColor: '#16A34A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }}
          >
            <View className="w-12 h-12 rounded-2xl bg-green-50 items-center justify-center mb-2">
              <Zap size={22} color="#16A34A" />
            </View>
            <Text className="font-bold text-gray-700 text-xs">Join Mission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Circles')}
            className="flex-1 bg-white p-5 rounded-[22px] ml-2 items-center"
            style={{ elevation: 4, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }}
          >
            <View className="w-12 h-12 rounded-2xl bg-purple-50 items-center justify-center mb-2">
              <Users size={22} color="#8B5CF6" />
            </View>
            <Text className="font-bold text-gray-700 text-xs">Local Circles</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>

      {/* Floating SOS button */}
      <TouchableOpacity
        onPress={handleSOS}
        disabled={sosTriggering}
        className="absolute bottom-28 right-5 w-14 h-14 bg-red-650 rounded-full items-center justify-center shadow-lg border border-red-500"
        style={{ elevation: 8, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 }}
      >
        {sosTriggering ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text className="text-white font-black text-[11px] tracking-wider">SOS</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
