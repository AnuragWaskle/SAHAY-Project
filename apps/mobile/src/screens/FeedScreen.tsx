import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Alert, Image } from 'react-native';
import { Heart, MessageCircle, MapPin, TrendingUp, Search, CheckCircle, Megaphone, Flame, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../api/client';

export default function FeedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [supportedIds, setSupportedIds] = useState<Set<string>>(new Set());

  const fetchFeed = useCallback(async () => {
    try {
      const res = await apiClient.get('/incidents');
      const rawData = res.data.data;
      let data = Array.isArray(rawData) ? rawData : (rawData?.items || []);
      data.sort((a: any, b: any) => {
        const scoreA = (a.priority_score || 0) + ((a.report_count || 0) * 10);
        const scoreB = (b.priority_score || 0) + ((b.report_count || 0) * 10);
        return scoreB - scoreA;
      });
      setFeedItems(data);
      setFiltered(data);
    } catch (e) {
      console.error('Failed to load feed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(feedItems);
    } else {
      const q = search.toLowerCase();
      setFiltered(feedItems.filter(item =>
        item.title?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      ));
    }
  }, [search, feedItems]);

  const handleUpvote = async (id: string, demandId: string | null) => {
    if (supportedIds.has(id)) {
      Alert.alert('Already Supported', 'You have already supported this issue.');
      return;
    }

    setSupportedIds(prev => new Set(prev).add(id));
    setFeedItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, report_count: (item.report_count || 0) + 1 };
      return item;
    }));

    if (demandId) {
      try {
        await apiClient.post(`/demands/${demandId}/support`);
      } catch (err) {
        setSupportedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        setFeedItems(prev => prev.map(item => {
          if (item.id === id) return { ...item, report_count: Math.max(0, (item.report_count || 0) - 1) };
          return item;
        }));
      }
    }
  };

  const handleCreateDemand = async (incident: any) => {
    try {
      const res = await apiClient.post('/demands', {
        incident_id: incident.id,
        title: `Demand: ${incident.title}`,
        description: incident.description,
      });
      Alert.alert('Demand Created!', 'Your civic demand has been submitted. Others can now support it. +5 Civic Points!');
      setFeedItems(prev => prev.map(item => {
        if (item.id === incident.id) return { ...item, demand_id: res.data.data.id };
        return item;
      }));
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create demand';
      Alert.alert('Error', msg);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'high': return { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' };
      case 'medium': return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      default: return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeed(); }} tintColor="#FF7E67" />}
    >
      {/* Curved Header Section */}
      <View
        className="bg-brand-orange pt-16 pb-14 px-6"
        style={{
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          shadowColor: '#FF7E67',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <Text className="text-3xl font-black text-white tracking-tight mb-1">{t('feed')}</Text>
        <View className="flex-row items-center">
          <Flame size={16} color="#FFF" />
          <Text className="text-white/80 font-bold text-sm ml-1.5">Trending in your City</Text>
        </View>

        {/* Search bar overlapping the curve */}
        <View
          className="flex-row items-center bg-white rounded-2xl px-4 py-3 mt-5"
          style={{
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
          }}
        >
          <Search size={20} color="#FF7E67" />
          <TextInput
            className="flex-1 ml-3 text-base font-medium text-gray-800"
            placeholder="Search issues..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Verify Card - Overlapping the header */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Verify')}
        className="mx-5 flex-row items-center bg-white p-4 rounded-[22px] border border-green-100"
        style={{
          marginTop: -16,
          elevation: 6,
          shadowColor: '#16A34A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
        }}
      >
        <View className="w-11 h-11 rounded-2xl bg-green-50 items-center justify-center border border-green-200">
          <CheckCircle size={22} color="#16A34A" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-black text-gray-900 text-sm">Verify Resolutions</Text>
          <Text className="text-gray-500 text-xs font-medium">Confirm if issues are actually fixed</Text>
        </View>
        <View className="bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <Text className="text-green-700 font-black text-xs">NEW</Text>
        </View>
      </TouchableOpacity>

      {/* Feed Content */}
      <View className="mt-6 pb-32">
        {loading ? (
          <View className="flex-1 items-center justify-center mt-20">
            <ActivityIndicator size="large" color="#FF7E67" />
            <Text className="text-gray-500 font-medium mt-4">Loading civic reports...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center justify-center mt-20 px-10">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <MapPin size={36} color="#CBD5E1" />
            </View>
            <Text className="text-center text-gray-500 font-bold mt-2 text-lg">
              {search ? 'No results found.' : 'No reports yet.'}
            </Text>
            <Text className="text-center text-gray-400 font-medium mt-1 text-sm">
              {search ? 'Try a different keyword' : 'Be the first to report an issue!'}
            </Text>
          </View>
        ) : (
          filtered.map((item, index) => {
            const severity = getSeverityColor(item.severity || 'low');
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.92}
                onPress={() => navigation.navigate('IncidentDetail', { incidentId: item.id })}
                className="mx-5 mb-5 bg-white rounded-[28px] overflow-hidden"
                style={{
                  elevation: 5,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                }}
              >
                {/* Card Image or Map Preview */}
                {item.media_urls && item.media_urls.length > 0 ? (
                  <View className="relative">
                    <Image
                      source={{ uri: item.media_urls[0].startsWith('http') ? item.media_urls[0] : `${apiClient.defaults.baseURL}${item.media_urls[0]}` }}
                      className="w-full h-48"
                      resizeMode="cover"
                    />
                    {/* Overlapping severity badge */}
                    <View
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: severity.bg, borderWidth: 1, borderColor: severity.border }}
                    >
                      <Text style={{ color: severity.text }} className="font-black text-xs uppercase">
                        {item.severity || 'new'}
                      </Text>
                    </View>
                    {/* Overlapping score pill at bottom-left */}
                    <View
                      className="absolute bottom-0 left-4 bg-white px-3 py-1.5 rounded-t-xl"
                      style={{ elevation: 2 }}
                    >
                      <View className="flex-row items-center">
                        <Flame size={12} color="#FF7E67" />
                        <Text className="text-brand-orange font-black text-xs ml-1">{item.priority_score || 0} pts</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="relative">
                    <View className="w-full h-28 bg-gradient-to-r items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
                      {item.lat && item.lng ? (
                        <View className="items-center">
                          <MapPin size={28} color="#FF7E67" />
                          <Text className="text-gray-400 font-bold text-xs mt-1">{Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}</Text>
                        </View>
                      ) : (
                        <View className="w-14 h-14 rounded-full bg-orange-50 items-center justify-center">
                          <MapPin size={24} color="#FF7E67" />
                        </View>
                      )}
                    </View>
                    <View
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: severity.bg, borderWidth: 1, borderColor: severity.border }}
                    >
                      <Text style={{ color: severity.text }} className="font-black text-xs uppercase">
                        {item.severity || 'new'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Card Content */}
                <View className="p-5">
                  {/* Category + Time row */}
                  <View className="flex-row items-center mb-2">
                    <View className="bg-gray-100 px-3 py-1 rounded-full">
                      <Text className="text-gray-600 font-bold text-xs uppercase">{item.category}</Text>
                    </View>
                    <View className="flex-row items-center ml-auto">
                      <Clock size={12} color="#9CA3AF" />
                      <Text className="text-gray-400 font-medium text-xs ml-1">
                        {item.report_count || 0} reports
                      </Text>
                    </View>
                  </View>

                  <Text className="font-black text-gray-900 text-lg mb-1.5 leading-tight">{item.title}</Text>
                  <Text className="text-gray-500 font-medium text-sm mb-4 leading-relaxed" numberOfLines={2}>{item.description}</Text>

                  {/* Action Buttons Row */}
                  <View className="flex-row items-center pt-3 border-t border-gray-100">
                    <TouchableOpacity
                      onPress={() => handleUpvote(item.id, item.demand_id)}
                      className={`flex-row items-center px-4 py-2.5 rounded-2xl mr-2 ${supportedIds.has(item.id) ? 'bg-red-50' : 'bg-gray-50'}`}
                      style={supportedIds.has(item.id) ? { borderWidth: 1.5, borderColor: '#FECACA' } : { borderWidth: 1, borderColor: '#F3F4F6' }}
                      disabled={supportedIds.has(item.id)}
                    >
                      <Heart color="#FF7E67" size={16} fill={supportedIds.has(item.id) ? '#FF7E67' : 'none'} />
                      <Text className={`font-black ml-1.5 text-xs ${supportedIds.has(item.id) ? 'text-red-600' : 'text-gray-700'}`}>
                        {supportedIds.has(item.id) ? 'Supported' : 'Support'} {item.report_count ? `(${item.report_count})` : ''}
                      </Text>
                    </TouchableOpacity>

                    {!item.demand_id ? (
                      <TouchableOpacity
                        onPress={() => handleCreateDemand(item)}
                        className="flex-row items-center bg-blue-50 px-4 py-2.5 rounded-2xl mr-2"
                        style={{ borderWidth: 1, borderColor: '#BFDBFE' }}
                      >
                        <Megaphone color="#3B82F6" size={14} />
                        <Text className="font-black text-blue-700 ml-1.5 text-xs">Demand</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('DemandDetail', { demandId: item.demand_id })}
                        className="flex-row items-center bg-green-50 px-4 py-2.5 rounded-2xl mr-2"
                        style={{ borderWidth: 1, borderColor: '#BBF7D0' }}
                      >
                        <Megaphone color="#16A34A" size={14} />
                        <Text className="font-black text-green-700 ml-1.5 text-xs">Active</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity className="flex-row items-center bg-gray-50 p-2.5 rounded-2xl ml-auto" style={{ borderWidth: 1, borderColor: '#F3F4F6' }}>
                      <MessageCircle color="#94A3B8" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
