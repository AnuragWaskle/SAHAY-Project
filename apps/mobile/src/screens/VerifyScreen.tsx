import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, ThumbsUp, ThumbsDown, Minus } from 'lucide-react-native';
import apiClient from '../api/client';

interface Demand {
  id: string;
  title: string;
  description: string;
  stage: string;
  incident_title: string;
  category: string;
  ward_name: string;
  supporters_count: number;
}

export default function VerifyScreen() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchDemands = useCallback(async () => {
    try {
      const res = await apiClient.get('/demands?stage=citizen_verification');
      const raw = res.data?.data;
      const items = Array.isArray(raw) ? raw : (raw?.items || []);
      setDemands(items);
    } catch (e) {
      console.error('Failed to fetch demands for verification', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  const submitVerification = async (demandId: string, verdict: 'solved' | 'partially_solved' | 'not_solved') => {
    setSubmitting(demandId);
    try {
      await apiClient.post(`/demands/${demandId}/verify`, { verdict });
      Alert.alert('Thank You!', 'Your verification has been recorded. +10 Civic Points!');
      setDemands(prev => prev.filter(d => d.id !== demandId));
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to submit verification';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#FF7E67" />
        <Text className="mt-4 text-gray-500 font-medium">Loading verification tasks...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA] pt-20 px-5 pb-32"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDemands(); }} tintColor="#FF7E67" />}
    >
      <View className="mb-6">
        <Text className="text-3xl font-black text-gray-900 tracking-tight mb-1">Verify Resolutions</Text>
        <Text className="text-gray-500 font-medium">Help confirm whether issues have been actually resolved.</Text>
      </View>

      {demands.length === 0 ? (
        <View className="items-center justify-center mt-16 px-8">
          <CheckCircle size={56} color="#CBD5E1" />
          <Text className="text-center text-gray-500 font-medium mt-4 text-lg">No issues pending verification right now.</Text>
          <Text className="text-center text-gray-400 text-sm mt-2">Check back later when resolved issues need citizen confirmation.</Text>
        </View>
      ) : (
        demands.map((demand) => (
          <View key={demand.id} className="bg-white rounded-[24px] p-6 mb-4 shadow-sm border border-gray-100" style={{ elevation: 3 }}>
            <View className="flex-row items-center mb-2">
              <View className="bg-green-100 px-3 py-1 rounded-full mr-2">
                <Text className="text-green-700 text-xs font-bold">Awaiting Verification</Text>
              </View>
              <Text className="text-xs text-gray-400">{demand.ward_name}</Text>
            </View>

            <Text className="text-xl font-bold text-gray-900 mb-2">{demand.title || demand.incident_title}</Text>
            <Text className="text-gray-600 font-medium mb-4" numberOfLines={3}>{demand.description}</Text>

            <Text className="text-sm font-bold text-gray-700 mb-3">Is this issue actually resolved?</Text>

            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => submitVerification(demand.id, 'solved')}
                disabled={submitting === demand.id}
                className="flex-1 flex-row items-center justify-center bg-green-500 py-3 rounded-2xl mr-2"
                style={{ elevation: 2 }}
              >
                <ThumbsUp size={18} color="white" />
                <Text className="text-white font-bold ml-2">Solved</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => submitVerification(demand.id, 'partially_solved')}
                disabled={submitting === demand.id}
                className="flex-1 flex-row items-center justify-center bg-yellow-500 py-3 rounded-2xl mr-2"
                style={{ elevation: 2 }}
              >
                <Minus size={18} color="white" />
                <Text className="text-white font-bold ml-2">Partial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => submitVerification(demand.id, 'not_solved')}
                disabled={submitting === demand.id}
                className="flex-1 flex-row items-center justify-center bg-red-500 py-3 rounded-2xl"
                style={{ elevation: 2 }}
              >
                <ThumbsDown size={18} color="white" />
                <Text className="text-white font-bold ml-2">No</Text>
              </TouchableOpacity>
            </View>

            {submitting === demand.id && (
              <View className="items-center mt-3">
                <ActivityIndicator size="small" color="#FF7E67" />
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
