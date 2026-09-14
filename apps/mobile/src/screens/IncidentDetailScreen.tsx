import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, Linking } from 'react-native';
import { MapPin, Heart, Clock, Users, MessageCircle, ChevronLeft, Megaphone, Video, Shield, Flame } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../api/client';

export default function IncidentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { incidentId } = route.params;
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get(`/incidents/${incidentId}`);
        setIncident(res.data.data);
      } catch (e) {
        console.error('Failed to load incident', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [incidentId]);

  const handleSupport = async () => {
    if (supported) {
      Alert.alert('Already Supported', 'You have already supported this demand.');
      return;
    }
    if (!incident?.demands?.[0]?.id) {
      Alert.alert('No Demand', 'No active demand for this incident yet.');
      return;
    }
    try {
      await apiClient.post(`/demands/${incident.demands[0].id}/support`);
      setSupported(true);
      Alert.alert('Supported!', '+2 Civic Impact Points');
      setIncident((prev: any) => ({
        ...prev,
        demands: prev.demands.map((d: any, i: number) =>
          i === 0 ? { ...d, supporters_count: (d.supporters_count || 0) + 1 } : d
        ),
      }));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to support');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#FF7E67" />
      </View>
    );
  }

  if (!incident) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA] px-8">
        <Text className="text-gray-500 text-lg font-medium text-center">Incident not found or failed to load.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6 bg-brand-orange px-6 py-3 rounded-2xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const media = incident.recent_reports?.flatMap((r: any) => {
    try {
      const urls = typeof r.media_urls === 'string' ? JSON.parse(r.media_urls) : r.media_urls;
      return Array.isArray(urls) ? urls : [];
    } catch { return []; }
  }) || [];

  const isVideo = (url: string) => /\.(mp4|mov|avi|webm)$/i.test(url);

  const getSeverityStyle = () => {
    switch (incident.severity?.toLowerCase()) {
      case 'critical': return { bg: '#DC2626', text: '#FFF' };
      case 'high': return { bg: '#EA580C', text: '#FFF' };
      case 'medium': return { bg: '#D97706', text: '#FFF' };
      default: return { bg: '#16A34A', text: '#FFF' };
    }
  };

  const severityStyle = getSeverityStyle();

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Curved Header with Hero Image */}
      <View
        className="relative bg-brand-orange"
        style={{
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          overflow: 'hidden',
        }}
      >
        {/* If there's media, show as hero */}
        {media.length > 0 && !isVideo(media[0]) ? (
          <Image
            source={{ uri: media[0].startsWith('http') ? media[0] : `${apiClient.defaults.baseURL}${media[0]}` }}
            className="w-full h-64"
            resizeMode="cover"
            style={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
          />
        ) : (
          <View className="w-full h-48" style={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}>
            <View className="flex-1 items-center justify-center pt-10">
              <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center">
                <MapPin size={32} color="#FFF" />
              </View>
            </View>
          </View>
        )}

        {/* Back button overlay */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute top-14 left-5 w-10 h-10 bg-white/90 rounded-2xl items-center justify-center"
          style={{ elevation: 4 }}
        >
          <ChevronLeft size={22} color="#FF7E67" />
        </TouchableOpacity>

        {/* Severity badge overlay */}
        <View
          className="absolute top-14 right-5 px-3 py-1.5 rounded-xl"
          style={{ backgroundColor: severityStyle.bg, elevation: 4 }}
        >
          <Text style={{ color: severityStyle.text }} className="font-black text-xs uppercase">
            {incident.severity || 'NEW'}
          </Text>
        </View>

        {/* Score pill overlay at bottom */}
        <View
          className="absolute bottom-4 right-5 flex-row items-center bg-white px-3 py-2 rounded-2xl"
          style={{ elevation: 4 }}
        >
          <Flame size={14} color="#FF7E67" />
          <Text className="text-brand-orange font-black text-sm ml-1">{incident.priority_score} pts</Text>
        </View>
      </View>

      {/* Title Card - Overlapping the header */}
      <View
        className="mx-5 bg-white p-6 rounded-[28px]"
        style={{
          marginTop: -28,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
        }}
      >
        <View className="flex-row flex-wrap mb-3">
          <View className="bg-blue-50 px-3 py-1.5 rounded-xl mr-2 mb-1 border border-blue-100">
            <Text className="text-xs font-black text-blue-700 uppercase">{incident.category}</Text>
          </View>
          <View className="bg-gray-50 px-3 py-1.5 rounded-xl mb-1 border border-gray-100">
            <Text className="text-xs font-bold text-gray-600">{incident.status?.replace(/_/g, ' ')}</Text>
          </View>
        </View>
        <Text className="text-2xl font-black text-gray-900 leading-tight mb-3">{incident.title}</Text>
        <Text className="text-gray-500 font-medium leading-relaxed text-sm">{incident.description}</Text>
      </View>

      {/* Location */}
      {incident.lat && incident.lng && (
        <View
          className="mx-5 mt-4 bg-white p-4 rounded-[22px] flex-row items-center"
          style={{
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          }}
        >
          <View className="w-10 h-10 rounded-2xl bg-orange-50 items-center justify-center">
            <MapPin size={18} color="#FF7E67" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-bold text-gray-800 text-sm">{incident.ward_name || 'Location Verified'}</Text>
            <Text className="text-xs text-gray-400 font-medium">{Number(incident.lat).toFixed(5)}, {Number(incident.lng).toFixed(5)}</Text>
          </View>
        </View>
      )}

      {/* Stats Row */}
      <View className="flex-row mx-5 mt-4">
        <View
          className="flex-1 bg-white p-4 rounded-[20px] items-center mr-2"
          style={{ elevation: 4, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 }}
        >
          <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mb-1.5">
            <Users size={16} color="#3B82F6" />
          </View>
          <Text className="text-xl font-black text-gray-900">{incident.report_count || 0}</Text>
          <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Reports</Text>
        </View>
        <View
          className="flex-1 bg-white p-4 rounded-[20px] items-center mx-1"
          style={{ elevation: 4, shadowColor: '#FF7E67', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 }}
        >
          <View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center mb-1.5">
            <Heart size={16} color="#FF7E67" />
          </View>
          <Text className="text-xl font-black text-gray-900">{incident.unique_citizen_count || 0}</Text>
          <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Citizens</Text>
        </View>
        <View
          className="flex-1 bg-white p-4 rounded-[20px] items-center ml-2"
          style={{ elevation: 4, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 }}
        >
          <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center mb-1.5">
            <Clock size={16} color="#8B5CF6" />
          </View>
          <Text className="text-xl font-black text-gray-900 text-center text-xs">{incident.status}</Text>
          <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</Text>
        </View>
      </View>

      {/* Media Gallery */}
      {media.length > 0 && (
        <View className="mt-5 px-5">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Evidence ({media.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {media.map((url: string, idx: number) => (
              <TouchableOpacity
                key={idx}
                onPress={() => { if (isVideo(url)) Linking.openURL(url); }}
                className="mr-3"
              >
                {isVideo(url) ? (
                  <View className="w-44 h-36 bg-gray-900 rounded-[20px] items-center justify-center" style={{ elevation: 4 }}>
                    <Video size={32} color="white" />
                    <Text className="text-white text-xs font-bold mt-1">Play Video</Text>
                  </View>
                ) : (
                  <View style={{ elevation: 4, borderRadius: 20, overflow: 'hidden' }}>
                    <Image
                      source={{ uri: url.startsWith('http') ? url : `${apiClient.defaults.baseURL}${url}` }}
                      className="w-44 h-36"
                      resizeMode="cover"
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* AI Priority Classification Card */}
      <View
        className="mx-5 mt-5 bg-indigo-50/50 p-5 rounded-[24px] border border-indigo-100/80 shadow-sm"
        style={{ elevation: 2 }}
      >
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 rounded-2xl bg-indigo-100 items-center justify-center">
            <Shield size={18} color="#4F46E5" />
          </View>
          <View className="ml-3">
            <Text className="text-sm font-black text-gray-800">AI Priority Explanation</Text>
            <Text className="text-[10px] text-indigo-700 font-black uppercase tracking-wider">Classification Factors</Text>
          </View>
        </View>

        <Text className="text-xs text-gray-500 font-medium leading-relaxed mb-4">
          Sahay's automated system classifies priority scores dynamically to prevent response bias and fast-track severe local problems.
        </Text>

        <View className="space-y-3">
          {/* Factor 1: Report Density */}
          <View className="flex-row items-center justify-between py-1">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-bold text-gray-700">Report Frequency Multiplier</Text>
              <Text className="text-[10px] text-gray-400 font-medium">Repeated reports in the location: {incident.report_count}</Text>
            </View>
            <View className="bg-indigo-100/40 px-2 py-1 rounded-md">
              <Text className="text-[11px] font-black text-indigo-700">+{Math.min(10, (incident.report_count || 1) * 2)} pts</Text>
            </View>
          </View>

          {/* Factor 2: Severity */}
          <View className="flex-row items-center justify-between py-1">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-bold text-gray-700">Hazard Gravity Rating</Text>
              <Text className="text-[10px] text-gray-400 font-medium">Severity classified as {incident.severity}</Text>
            </View>
            <View className="bg-indigo-100/40 px-2 py-1 rounded-md">
              <Text className="text-[11px] font-black text-indigo-700">
                +{incident.severity?.toLowerCase() === 'critical' ? '25' :
                  incident.severity?.toLowerCase() === 'high' ? '15' : '10'} pts
              </Text>
            </View>
          </View>

          {/* Factor 3: Citizen consensus */}
          <View className="flex-row items-center justify-between py-1">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-bold text-gray-700">Community Consensus Weight</Text>
              <Text className="text-[10px] text-gray-400 font-medium">Distinct verified citizen signatures: {incident.unique_citizen_count || 1}</Text>
            </View>
            <View className="bg-indigo-100/40 px-2 py-1 rounded-md">
              <Text className="text-[11px] font-black text-indigo-700">
                +{Math.min(15, (incident.unique_citizen_count || 1) * 3)} pts
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-4 pt-3.5 border-t border-indigo-100/50 flex-row justify-between items-center">
          <Text className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-widest">Aggregate Priority score</Text>
          <Text className="text-lg font-black text-indigo-650">{Number(incident.priority_score).toFixed(0)} Points</Text>
        </View>
      </View>

      {/* Demand Section */}
      {incident.demands && incident.demands.length > 0 && (
        <View
          className="mx-5 mt-5 bg-white p-5 rounded-[24px]"
          style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 }}
        >
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center">
              <Megaphone size={18} color="#3B82F6" />
            </View>
            <Text className="text-base font-black text-gray-900 ml-3">Active Demand</Text>
          </View>
          <Text className="text-gray-600 font-medium mb-3 text-sm">{incident.demands[0].title || incident.title}</Text>
          <View className="flex-row items-center mb-4">
            <View className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 mr-2">
              <Text className="text-xs font-bold text-blue-700">{incident.demands[0].stage?.replace(/_/g, ' ')}</Text>
            </View>
            <Text className="text-sm text-gray-500 font-medium">{incident.demands[0].supporters_count || 0} supporters</Text>
          </View>
          <View className="flex-row">
            <TouchableOpacity
              onPress={handleSupport}
              disabled={supported}
              className={`flex-1 py-3.5 rounded-2xl items-center mr-2 ${supported ? 'bg-green-500' : 'bg-brand-orange'}`}
              style={{
                elevation: 4,
                shadowColor: supported ? '#16A34A' : '#FF7E67',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            >
              <Text className="text-white font-black text-sm">
                {supported ? 'Supported!' : 'Support'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('DemandDetail', { demandId: incident.demands[0].id })}
              className="flex-1 py-3.5 rounded-2xl items-center ml-2 bg-blue-600"
              style={{ elevation: 4 }}
            >
              <Text className="text-white font-black text-sm">View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Comments */}
      {incident.comments && incident.comments.length > 0 && (
        <View
          className="mx-5 mt-5 bg-white p-5 rounded-[24px]"
          style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 }}
        >
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 rounded-2xl bg-gray-50 items-center justify-center">
              <MessageCircle size={18} color="#6B7280" />
            </View>
            <Text className="text-base font-black text-gray-900 ml-3">Comments ({incident.comments.length})</Text>
          </View>
          {incident.comments.slice(0, 10).map((comment: any) => (
            <View key={comment.id} className="pb-3 mb-3 border-b border-gray-50">
              <View className="flex-row items-center mb-1.5">
                <View className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center mr-2">
                  <Text className="text-xs font-bold text-gray-500">{comment.name?.[0] || 'U'}</Text>
                </View>
                <Text className="font-bold text-gray-800 text-sm">{comment.name}</Text>
                {comment.is_official && (
                  <View className="bg-blue-50 px-2 py-0.5 rounded-full ml-2 border border-blue-100">
                    <Text className="text-blue-700 text-[10px] font-black">Official</Text>
                  </View>
                )}
              </View>
              <Text className="text-gray-600 text-sm ml-9">{comment.content}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Reports */}
      {incident.recent_reports && incident.recent_reports.length > 0 && (
        <View
          className="mx-5 mt-5 bg-white p-5 rounded-[24px]"
          style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 }}
        >
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 rounded-2xl bg-orange-50 items-center justify-center">
              <Shield size={18} color="#FF7E67" />
            </View>
            <Text className="text-base font-black text-gray-900 ml-3">Recent Reports ({incident.recent_reports.length})</Text>
          </View>
          {incident.recent_reports.slice(0, 5).map((report: any) => (
            <View key={report.id} className="pb-3 mb-3 border-b border-gray-50">
              <Text className="text-gray-700 text-sm font-medium">{report.description}</Text>
              <Text className="text-gray-400 text-xs mt-1 font-medium">
                by {report.reporter_name || 'Anonymous'} • {((report.evidence_confidence || 0) * 100).toFixed(0)}% confidence
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
