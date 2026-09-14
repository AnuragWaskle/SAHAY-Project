import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Target,
  Users,
  MessageSquare,
  TrendingUp,
  MapPin,
  Calendar,
  Send,
  Camera,
  Image as LucideImage,
  CheckCircle,
  Sparkles,
} from 'lucide-react-native';
import apiClient from '../api/client';

const { width } = Dimensions.get('window');

type Participant = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  civic_impact_score: number;
  joined_at: string;
};

type MissionDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'completed' | 'proposed';
  goal_metric: string;
  current_progress: number;
  target: number;
  participant_count: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  ward_name: string | null;
  city_name: string | null;
  is_participant: boolean;
  participants: Participant[];
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
  avatar_url: string | null;
};

type ProgressReport = {
  id: string;
  amount: number;
  evidence_url: string | null;
  description: string | null;
  status: string;
  created_at: string;
  user_name: string;
  avatar_url: string | null;
};

type TabType = 'about' | 'reports' | 'discussion';

export default function MissionDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { missionId } = route.params;

  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [loading, setLoading] = useState(true);

  // Form states
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [joining, setJoining] = useState(false);

  // Modal states for reporting progress
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportAmount, setReportAmount] = useState('1');
  const [reportDesc, setReportDesc] = useState('');
  const [reportPhoto, setReportPhoto] = useState<string | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchMissionDetails = useCallback(async () => {
    try {
      const res = await apiClient.get(`/missions/${missionId}`);
      if (res.data?.success) {
        setMission(res.data.data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load mission details');
    }
  }, [missionId]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await apiClient.get(`/missions/${missionId}/comments`);
      if (res.data?.success) {
        setComments(res.data.data);
      }
    } catch {}
  }, [missionId]);

  const fetchProgressReports = useCallback(async () => {
    try {
      const res = await apiClient.get(`/missions/${missionId}/progress-reports`);
      if (res.data?.success) {
        setProgressReports(res.data.data);
      }
    } catch {}
  }, [missionId]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMissionDetails(), fetchComments(), fetchProgressReports()]);
    setLoading(false);
  }, [fetchMissionDetails, fetchComments, fetchProgressReports]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleJoin = async () => {
    if (!mission) return;
    setJoining(true);
    try {
      const res = await apiClient.post(`/missions/${mission.id}/join`);
      if (res.data?.success) {
        Alert.alert('Success 🎉', 'You have successfully joined the mission! Let us work together.');
        await fetchMissionDetails();
      }
    } catch (err: any) {
      Alert.alert('Failed', err.response?.data?.error || 'Failed to join mission');
    } finally {
      setJoining(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || postingComment || !mission) return;
    setPostingComment(true);
    try {
      const res = await apiClient.post(`/missions/${mission.id}/comments`, { content: newComment.trim() });
      if (res.data?.success) {
        setNewComment('');
        await fetchComments();
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send comment');
    } finally {
      setPostingComment(false);
    }
  };

  // Image upload handler
  const handlePickPhoto = async (fromCamera: boolean) => {
    let result;
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Required');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Gallery Permission Required');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });
    }

    if (!result.canceled) {
      setReportPhoto(result.assets[0].uri);
    }
  };

  const handleSubmitProgress = async () => {
    if (!mission) return;
    if (!reportDesc.trim()) {
      Alert.alert('Missing Info', 'Please describe your progress.');
      return;
    }
    if (!reportPhoto) {
      Alert.alert('Missing Evidence', 'Please upload a photo of your work as evidence.');
      return;
    }

    setSubmittingReport(true);
    try {
      let evidenceUrl = null;

      // Upload file to backend
      const formData = new FormData();
      const filename = reportPhoto.split('/').pop() || 'photo.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      formData.append('file', { uri: reportPhoto, name: filename, type: mimeType } as any);

      const uploadRes = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (uploadRes.data?.data?.url) {
        evidenceUrl = uploadRes.data.data.url;
      }

      // Submit progress report
      const progressRes = await apiClient.post(`/missions/${mission.id}/progress`, {
        amount: parseInt(reportAmount) || 1,
        description: reportDesc.trim(),
        evidence_url: evidenceUrl,
      });

      if (progressRes.data?.success) {
        Alert.alert('Success!', progressRes.data.message || 'Progress reported successfully.');
        setReportModalVisible(false);
        setReportDesc('');
        setReportPhoto(null);
        setReportAmount('1');
        await loadAllData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit progress report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const getCreditsForCategory = (category: string) => {
    switch (category.toLowerCase()) {
      case 'tree_hazard':
        return 50;
      case 'garbage':
        return 30;
      case 'safety':
        return 40;
      default:
        return 25;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#FF7E67" />
        <Text className="mt-3 text-gray-500 font-medium text-sm">Loading mission...</Text>
      </View>
    );
  }

  if (!mission) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA] px-6">
        <ChevronLeft size={48} color="#9CA3AF" />
        <Text className="text-gray-600 text-lg font-bold mt-4">Mission Not Found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-brand-orange px-6 py-2.5 rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressPercentage = mission.target > 0 ? (mission.current_progress / mission.target) * 100 : 0;
  const clampedProgress = Math.min(progressPercentage, 100);

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Map Header */}
        <View className="h-64 w-full relative">
          {mission.latitude && mission.longitude ? (
            <MapView
              className="w-full h-full"
              initialRegion={{
                latitude: mission.latitude,
                longitude: mission.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{ latitude: mission.latitude, longitude: mission.longitude }}
                pinColor="#16A34A"
              />
            </MapView>
          ) : (
            <View className="w-full h-full bg-gray-200 items-center justify-center">
              <MapPin size={48} color="#9CA3AF" />
              <Text className="text-gray-400 font-medium mt-2">Map Unavailable</Text>
            </View>
          )}

          {/* Floating Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute top-12 left-4 w-10 h-10 bg-white rounded-full items-center justify-center shadow-md border border-gray-100"
          >
            <ChevronLeft size={22} color="#475569" />
          </TouchableOpacity>

          {/* Floating Category Badge */}
          <View className="absolute bottom-4 left-4 bg-brand-orange px-3 py-1.5 rounded-full shadow-md">
            <Text className="text-white text-xs font-black capitalize">{mission.category.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Content Container */}
        <View className="px-5 pt-5">
          {/* Status and Title */}
          <View className="flex-row items-center mb-2">
            <View className={`px-2.5 py-1 rounded-full ${mission.status === 'active' ? 'bg-brand-green' : 'bg-yellow-500'}`}>
              <Text className="text-white text-[10px] font-extrabold capitalize tracking-wider">{mission.status}</Text>
            </View>
            {mission.ward_name && (
              <Text className="text-xs text-gray-400 font-bold ml-3 uppercase tracking-wider">{mission.ward_name}</Text>
            )}
          </View>
          <Text className="text-2xl font-black text-gray-900 leading-tight mb-3">{mission.title}</Text>

          {/* Goal & Metrics Progress Card */}
          <View
            className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm mb-5"
            style={{
              elevation: 4,
              shadowColor: '#1E293B',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Target size={18} color="#FF7E67" />
                <Text className="ml-2 font-bold text-gray-800 text-sm">{mission.goal_metric}</Text>
              </View>
              <Text className="font-black text-brand-orange text-base">
                {mission.current_progress} / {mission.target}
              </Text>
            </View>
            <View className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
              <View className="h-full bg-brand-green rounded-full" style={{ width: `${clampedProgress}%` }} />
            </View>
            <Text className="text-[10px] font-bold text-gray-400 text-right uppercase tracking-wider">
              {Math.round(clampedProgress)}% Completed
            </Text>
          </View>

          {/* Tabs Navigation */}
          <View className="flex-row bg-gray-100 p-1.5 rounded-2xl mb-5">
            {(['about', 'reports', 'discussion'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl items-center ${activeTab === tab ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`text-xs font-black uppercase tracking-wider ${activeTab === tab ? 'text-brand-orange' : 'text-gray-500'}`}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Contents */}
          {activeTab === 'about' && (
            <View>
              {/* Rewards Spotlight Card */}
              <View
                className="bg-emerald-600/5 border border-emerald-600/10 p-5 rounded-[24px] flex-row items-center mb-5"
                style={{ shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8 }}
              >
                <View className="w-12 h-12 rounded-2xl bg-emerald-600/10 items-center justify-center">
                  <Sparkles size={24} color="#16A34A" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-extrabold text-emerald-800 text-sm uppercase tracking-wider">Reward</Text>
                  <Text className="text-emerald-600 font-black text-lg mt-0.5">+{getCreditsForCategory(mission.category)} Civic Credits</Text>
                </View>
              </View>

              {/* Description */}
              <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">Description</Text>
              <Text className="text-gray-700 text-base leading-relaxed mb-6">{mission.description}</Text>

              {/* Mission Metadata Row */}
              <View className="flex-row mb-6 border-b border-gray-100 pb-5">
                <View className="flex-1 flex-row items-center">
                  <Users size={18} color="#475569" />
                  <View className="ml-2.5">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Volunteers</Text>
                    <Text className="font-bold text-gray-800 text-sm mt-0.5">{mission.participant_count} Joined</Text>
                  </View>
                </View>
                <View className="flex-1 flex-row items-center">
                  <Calendar size={18} color="#475569" />
                  <View className="ml-2.5">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Created On</Text>
                    <Text className="font-bold text-gray-800 text-sm mt-0.5">
                      {new Date(mission.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Participants list */}
              <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-3">Participant Roll</Text>
              {mission.participants?.length > 0 ? (
                <View className="flex-row flex-wrap">
                  {mission.participants.map((p, idx) => (
                    <View
                      key={p.user_id}
                      className="bg-white border border-gray-100 px-3.5 py-2 rounded-2xl flex-row items-center mr-2.5 mb-2.5"
                    >
                      <View className="w-6 h-6 rounded-full bg-brand-orange/10 items-center justify-center mr-2">
                        <Text className="text-[10px] font-bold text-brand-orange">{p.name[0]}</Text>
                      </View>
                      <Text className="text-xs font-bold text-gray-700">{p.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-gray-400 italic">No volunteers have joined yet. Be the first!</Text>
              )}
            </View>
          )}

          {activeTab === 'reports' && (
            <View>
              <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-4">Fulfillment Logs</Text>
              {progressReports.length > 0 ? (
                progressReports.map((report) => (
                  <View key={report.id} className="bg-white border border-gray-100 p-4 rounded-[22px] mb-3.5 shadow-sm">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center">
                        <View className="w-8 h-8 rounded-xl bg-orange-50 items-center justify-center mr-2">
                          <Text className="text-brand-orange font-bold text-xs">{report.user_name[0]}</Text>
                        </View>
                        <View>
                          <Text className="font-bold text-gray-800 text-xs">{report.user_name}</Text>
                          <Text className="text-[9px] text-gray-400 mt-0.5">
                            {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                      <View className="bg-emerald-50 px-2 py-1 rounded-lg">
                        <Text className="text-emerald-600 text-[10px] font-black">+{report.amount} contribution</Text>
                      </View>
                    </View>
                    {report.description && (
                      <Text className="text-gray-600 text-sm leading-relaxed mb-3">{report.description}</Text>
                    )}
                    {report.evidence_url && (
                      <Image
                        source={{ uri: `${apiClient.defaults.baseURL?.replace('/api/v1', '')}${report.evidence_url}` }}
                        className="w-full h-40 rounded-xl bg-gray-100"
                        resizeMode="cover"
                      />
                    )}
                  </View>
                ))
              ) : (
                <View className="items-center py-10">
                  <TrendingUp size={36} color="#9CA3AF" />
                  <Text className="text-gray-400 text-sm mt-2 text-center font-bold">No progress contributions logged yet.</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'discussion' && (
            <View>
              <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-4 font-black">Discussion Feed</Text>

              {/* Chat timeline */}
              <View className="mb-4">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <View key={comment.id} className="flex-row items-start mb-4">
                      <View className="w-8 h-8 rounded-full bg-brand-orange/15 items-center justify-center mr-3">
                        <Text className="text-brand-orange font-extrabold text-xs">{comment.user_name[0]}</Text>
                      </View>
                      <View className="flex-1 bg-white border border-gray-100 p-3.5 rounded-2xl">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="font-bold text-gray-800 text-xs">{comment.user_name}</Text>
                          <Text className="text-[9px] text-gray-400">
                            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text className="text-gray-600 text-sm leading-relaxed">{comment.content}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View className="items-center py-8">
                    <MessageSquare size={36} color="#9CA3AF" />
                    <Text className="text-gray-400 text-sm mt-2 font-bold">Start the conversation!</Text>
                  </View>
                )}
              </View>

              {/* Input section */}
              <View className="flex-row items-center bg-white border border-gray-150 p-2 rounded-2xl">
                <TextInput
                  placeholder="Type a message..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 px-3 text-sm text-gray-800 py-2.5"
                  value={newComment}
                  onChangeText={setNewComment}
                  maxLength={250}
                />
                <TouchableOpacity
                  onPress={handlePostComment}
                  disabled={postingComment || !newComment.trim()}
                  className="bg-brand-orange w-10 h-10 rounded-xl items-center justify-center shadow-sm"
                >
                  {postingComment ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Send size={16} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Persistent Bottom Action Drawer */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 flex-row items-center justify-between"
        style={{
          shadowColor: '#1E293B',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <View>
          <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Credits at stake</Text>
          <Text className="text-emerald-600 text-lg font-black">{getCreditsForCategory(mission.category)} CC</Text>
        </View>

        {mission.status !== 'completed' ? (
          !mission.is_participant ? (
            <TouchableOpacity
              onPress={handleJoin}
              disabled={joining}
              className="bg-brand-orange px-8 py-3.5 rounded-2xl flex-row items-center justify-center min-w-[180px]"
            >
              {joining ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Users size={16} color="#FFF" />
                  <Text className="text-white font-black text-sm ml-2">Join Mission</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setReportModalVisible(true)}
              className="bg-emerald-600 px-8 py-3.5 rounded-2xl flex-row items-center justify-center min-w-[180px]"
            >
              <TrendingUp size={16} color="#FFF" />
              <Text className="text-white font-black text-sm ml-2">Report Progress</Text>
            </TouchableOpacity>
          )
        ) : (
          <View className="bg-yellow-50 px-6 py-3 rounded-2xl border border-yellow-100">
            <Text className="text-yellow-600 font-extrabold text-sm">Mission Completed 🎉</Text>
          </View>
        )}
      </View>

      {/* Verified Progress Upload Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-[36px] p-6 max-h-[85%]">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-5 border-b border-gray-50 pb-3">
              <Text className="text-lg font-black text-gray-900">Report Verified Progress</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Text className="text-sm text-gray-400 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Contribution Metric Amount */}
              <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Contribution Amount</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1.5 flex-row items-center mb-5">
                <TextInput
                  keyboardType="numeric"
                  className="flex-1 py-2 text-base font-bold text-gray-800"
                  value={reportAmount}
                  onChangeText={setReportAmount}
                />
                <Text className="text-gray-400 font-bold text-sm ml-2">{mission.goal_metric}</Text>
              </View>

              {/* Progress description */}
              <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">What did you accomplish?</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-5 min-h-[100px]">
                <TextInput
                  placeholder="Tell us what you completed (e.g. planted 2 gulmohar trees behind the community park)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  className="text-gray-800 text-sm leading-relaxed"
                  value={reportDesc}
                  onChangeText={setReportDesc}
                />
              </View>

              {/* Photo Evidence Upload Box */}
              <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Photo Evidence</Text>
              {reportPhoto ? (
                <View className="mb-5 relative rounded-2xl overflow-hidden border border-gray-200">
                  <Image source={{ uri: reportPhoto }} className="w-full h-48 bg-gray-100" resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => setReportPhoto(null)}
                    className="absolute top-3 right-3 bg-black/60 w-8 h-8 rounded-full items-center justify-center"
                  >
                    <Text className="text-white font-extrabold text-xs">X</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row mb-5">
                  <TouchableOpacity
                    onPress={() => handlePickPhoto(true)}
                    className="flex-1 bg-orange-50 border border-brand-orange/20 p-5 rounded-2xl items-center mr-2"
                  >
                    <Camera size={24} color="#FF7E67" />
                    <Text className="text-brand-orange font-bold text-xs mt-1.5">Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handlePickPhoto(false)}
                    className="flex-1 bg-gray-50 border border-gray-200 p-5 rounded-2xl items-center ml-2"
                  >
                    <LucideImage size={24} color="#6B7280" />
                    <Text className="text-gray-500 font-bold text-xs mt-1.5">Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmitProgress}
                disabled={submittingReport}
                className="bg-brand-orange py-4 rounded-2xl items-center justify-center flex-row shadow-md"
                style={{ shadowColor: '#FF7E67', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 }}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#FFF" />
                    <Text className="text-white font-black text-base ml-2">Submit and Verify</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
