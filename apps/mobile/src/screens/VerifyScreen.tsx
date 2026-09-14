import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Briefcase,
  Play,
  Camera,
  Image as LucideImage,
  ClipboardList,
  WifiOff,
} from 'lucide-react-native';
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
  evidence_before: string[] | null;
  evidence_after: string[] | null;
}

interface WorkOrder {
  id: string;
  demand_id: string;
  demand_title: string;
  demand_description: string;
  status: 'created' | 'assigned' | 'in_progress' | 'completed' | 'verified';
  evidence_before: string[];
  evidence_after: string[];
  notes: string | null;
  estimated_cost?: number;
}

export default function VerifyScreen() {
  const [activeTab, setActiveTab] = useState<'verify' | 'contractor'>('verify');
  const [demands, setDemands] = useState<Demand[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Contractor action states
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [activeWO, setActiveWO] = useState<WorkOrder | null>(null);
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [completingTask, setCompletingTask] = useState(false);

  const fetchDemands = useCallback(async () => {
    try {
      const res = await apiClient.get('/demands?stage=citizen_verification');
      const raw = res.data?.data;
      const items = Array.isArray(raw) ? raw : (raw?.items || []);
      setDemands(items);
      setIsOffline(false);
      await AsyncStorage.setItem('cached_demands', JSON.stringify(items));
    } catch (e) {
      setIsOffline(true);
      const cached = await AsyncStorage.getItem('cached_demands');
      if (cached) {
        setDemands(JSON.parse(cached));
      }
    }
  }, []);

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await apiClient.get('/work-orders?contractor_id=me');
      if (res.data?.success) {
        const data = res.data.data;
        setWorkOrders(data);
        setIsOffline(false);
        await AsyncStorage.setItem('cached_work_orders', JSON.stringify(data));
      }
    } catch (e) {
      setIsOffline(true);
      const cached = await AsyncStorage.getItem('cached_work_orders');
      if (cached) {
        setWorkOrders(JSON.parse(cached));
      }
    }
  }, []);

  const processOfflineQueue = useCallback(async () => {
    try {
      const queueRaw = await AsyncStorage.getItem('offline_wo_actions');
      if (!queueRaw) return;
      const queue = JSON.parse(queueRaw);
      if (queue.length === 0) return;

      console.log('Syncing offline actions...', queue);
      for (const action of queue) {
        if (action.status === 'in_progress') {
          await apiClient.patch(`/work-orders/${action.woId}/contractor`, { status: 'in_progress' });
        } else if (action.status === 'completed') {
          await apiClient.patch(`/work-orders/${action.woId}/contractor`, {
            status: 'completed',
            evidence_after: action.evidence_after,
            notes: action.notes,
          });
        }
      }
      await AsyncStorage.removeItem('offline_wo_actions');
      Alert.alert('Offline Sync Complete', 'All locally saved field updates have been synced to the database!');
      await fetchWorkOrders();
    } catch (e) {
      console.log('Failed to sync offline updates (still offline or server error)');
    }
  }, [fetchWorkOrders]);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'verify') {
      await fetchDemands();
    } else {
      await fetchWorkOrders();
      await processOfflineQueue();
    }
    setLoading(false);
    setRefreshing(false);
  }, [activeTab, fetchDemands, fetchWorkOrders, processOfflineQueue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const submitVerification = async (demandId: string, verdict: 'solved' | 'partially_solved' | 'not_solved') => {
    setSubmitting(demandId);
    try {
      await apiClient.post(`/demands/${demandId}/verify`, { verdict });
      Alert.alert('Thank You!', 'Your verification has been recorded. +10 Civic Points!');
      setDemands(prev => prev.filter(d => d.id !== demandId));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit verification');
    } finally {
      setSubmitting(null);
    }
  };

  // Contractor Action handlers
  const queueOfflineAction = async (action: any) => {
    try {
      const queueRaw = await AsyncStorage.getItem('offline_wo_actions');
      const queue = queueRaw ? JSON.parse(queueRaw) : [];
      queue.push(action);
      await AsyncStorage.setItem('offline_wo_actions', JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to queue offline update', e);
    }
  };

  const handleStartWork = async (woId: string) => {
    try {
      const res = await apiClient.patch(`/work-orders/${woId}/contractor`, { status: 'in_progress' });
      if (res.data?.success) {
        Alert.alert('Job Started 🛠️', 'Work order is now in progress.');
        fetchWorkOrders();
      }
    } catch (err: any) {
      // Offline mode caching support
      await queueOfflineAction({ woId, status: 'in_progress' });
      // Optimistic state update
      setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, status: 'in_progress' } : w));
      Alert.alert('Saved Offline', 'You are currently offline. The job start has been saved locally and will sync later!');
    }
  };

  const handlePickResolutionPhoto = async (fromCamera: boolean) => {
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
      setResolutionPhoto(result.assets[0].uri);
    }
  };

  const handleCompleteWork = async () => {
    if (!activeWO) return;
    if (!resolutionNotes.trim()) {
      Alert.alert('Missing Notes', 'Please enter notes about the work completed.');
      return;
    }
    if (!resolutionPhoto) {
      Alert.alert('Missing Evidence', 'Please upload a resolution photo as proof.');
      return;
    }

    setCompletingTask(true);
    try {
      let evidenceUrl = null;

      if (!isOffline) {
        const formData = new FormData();
        const filename = resolutionPhoto.split('/').pop() || 'photo.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        formData.append('file', { uri: resolutionPhoto, name: filename, type: mimeType } as any);

        const uploadRes = await apiClient.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.data?.data?.url) {
          evidenceUrl = uploadRes.data.data.url;
        }

        const res = await apiClient.patch(`/work-orders/${activeWO.id}/contractor`, {
          status: 'completed',
          evidence_after: [evidenceUrl],
          notes: resolutionNotes.trim(),
        });

        if (res.data?.success) {
          Alert.alert('Job Completed 🎉', 'Resolution photo uploaded. Demand moved to citizen verification stage!');
          setResolutionModalVisible(false);
          setResolutionNotes('');
          setResolutionPhoto(null);
          setActiveWO(null);
          fetchWorkOrders();
        }
      } else {
        throw new Error('Offline');
      }
    } catch (err: any) {
      // Offline mode saving support
      await queueOfflineAction({
        woId: activeWO.id,
        status: 'completed',
        notes: resolutionNotes.trim(),
        evidence_after: [resolutionPhoto], // Use local file URI for syncing
      });

      // Optimistic update
      setWorkOrders(prev => prev.map(w => w.id === activeWO.id ? { ...w, status: 'completed', notes: resolutionNotes } : w));
      Alert.alert('Resolution Saved Offline', 'You are currently offline. Your completion report and photo have been cached locally and will sync once online!');
      setResolutionModalVisible(false);
      setResolutionNotes('');
      setResolutionPhoto(null);
      setActiveWO(null);
    } finally {
      setCompletingTask(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#FF7E67" />
        <Text className="mt-4 text-gray-500 font-medium">Loading data...</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'in_progress': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'completed': return 'text-green-600 bg-green-50 border-green-100';
      default: return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <ScrollView
        className="flex-1 px-5 pt-20"
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF7E67" />}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-3xl font-black text-gray-900 tracking-tight">Verify & Act</Text>
            {isOffline && (
              <View className="flex-row items-center bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                <WifiOff size={14} color="#D97706" />
                <Text className="text-amber-700 text-[10px] font-black uppercase ml-1">Offline</Text>
              </View>
            )}
          </View>
          <Text className="text-gray-500 font-medium text-sm">Verify completed municipal tasks or execute assigned field work orders.</Text>
        </View>

        {/* Console Toggle Tab */}
        <View className="flex-row bg-gray-200/60 p-1 rounded-2xl mb-6">
          <TouchableOpacity
            onPress={() => setActiveTab('verify')}
            className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'verify' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`text-xs font-black uppercase tracking-wider ${activeTab === 'verify' ? 'text-brand-orange' : 'text-gray-500'}`}>
              Verify Resolutions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('contractor')}
            className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'contractor' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`text-xs font-black uppercase tracking-wider ${activeTab === 'contractor' ? 'text-brand-orange' : 'text-gray-500'}`}>
              Field Tasks
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Verify Resolutions */}
        {activeTab === 'verify' && (
          demands.length === 0 ? (
            <View className="items-center justify-center mt-16 px-8">
              <CheckCircle size={56} color="#CBD5E1" />
              <Text className="text-center text-gray-500 font-bold mt-4 text-lg">No issues pending verification</Text>
              <Text className="text-center text-gray-400 text-sm mt-2 leading-relaxed">Check back later when resolved issues need citizen confirmation.</Text>
            </View>
          ) : (
            demands.map((demand) => (
              <View key={demand.id} className="bg-white rounded-[26px] p-5 mb-5 shadow-sm border border-gray-100" style={{ elevation: 2 }}>
                <div className="flex-row items-center justify-between mb-3.5">
                  <View className="bg-green-50 border border-green-100 px-3 py-1 rounded-full">
                    <Text className="text-green-700 text-[10px] font-black uppercase tracking-wider">Awaiting Proof Verification</Text>
                  </View>
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{demand.ward_name}</Text>
                </div>

                <Text className="text-lg font-black text-gray-900 mb-1.5 leading-tight">{demand.title || demand.incident_title}</Text>
                <Text className="text-gray-500 font-medium text-sm mb-4 leading-relaxed">{demand.description}</Text>

                {/* Before / After Photo Slider */}
                {((demand.evidence_before && demand.evidence_before.length > 0) || (demand.evidence_after && demand.evidence_after.length > 0)) && (
                  <View className="mb-4">
                    <Text className="text-xs font-black text-gray-400 uppercase mb-2.5 tracking-wider">Visual Evidence Comparison</Text>
                    <View className="flex-row">
                      {demand.evidence_before && demand.evidence_before.length > 0 && (
                        <View className="flex-1 mr-2 relative rounded-2xl overflow-hidden border border-gray-100">
                          <Image
                            source={{ uri: demand.evidence_before[0].startsWith('http') ? demand.evidence_before[0] : `${apiClient.defaults.baseURL?.replace('/api/v1', '')}${demand.evidence_before[0]}` }}
                            className="w-full h-36 bg-gray-100"
                            resizeMode="cover"
                          />
                          <View className="absolute bottom-2.5 left-2.5 bg-black/60 px-2 py-1 rounded-lg">
                            <Text className="text-[9px] text-white font-extrabold tracking-wider">BEFORE</Text>
                          </View>
                        </View>
                      )}
                      {demand.evidence_after && demand.evidence_after.length > 0 && (
                        <View className="flex-1 relative rounded-2xl overflow-hidden border border-gray-100">
                          <Image
                            source={{ uri: demand.evidence_after[0].startsWith('http') ? demand.evidence_after[0] : `${apiClient.defaults.baseURL?.replace('/api/v1', '')}${demand.evidence_after[0]}` }}
                            className="w-full h-36 bg-gray-100"
                            resizeMode="cover"
                          />
                          <View className="absolute bottom-2.5 left-2.5 bg-emerald-600 px-2 py-1 rounded-lg">
                            <Text className="text-[9px] text-white font-extrabold tracking-wider">AFTER</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                <Text className="text-xs font-black text-gray-800 mb-3.5 uppercase tracking-wider">Confirm resolution status:</Text>

                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => submitVerification(demand.id, 'solved')}
                    disabled={submitting === demand.id}
                    className="flex-1 flex-row items-center justify-center bg-green-500 py-3.5 rounded-2xl mr-2 shadow-sm"
                  >
                    <ThumbsUp size={16} color="white" />
                    <Text className="text-white font-black text-sm ml-2">Resolved</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => submitVerification(demand.id, 'partially_solved')}
                    disabled={submitting === demand.id}
                    className="flex-1 flex-row items-center justify-center bg-yellow-500 py-3.5 rounded-2xl mr-2 shadow-sm"
                  >
                    <Minus size={16} color="white" />
                    <Text className="text-white font-black text-sm ml-2">Partial</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => submitVerification(demand.id, 'not_solved')}
                    disabled={submitting === demand.id}
                    className="flex-1 flex-row items-center justify-center bg-red-500 py-3.5 rounded-2xl shadow-sm"
                  >
                    <ThumbsDown size={16} color="white" />
                    <Text className="text-white font-black text-sm ml-2">Unsolved</Text>
                  </TouchableOpacity>
                </View>

                {submitting === demand.id && (
                  <View className="items-center mt-3">
                    <ActivityIndicator size="small" color="#FF7E67" />
                  </View>
                )}
              </View>
            ))
          )
        )}

        {/* Tab 2: Contractor Tasks */}
        {activeTab === 'contractor' && (
          workOrders.length === 0 ? (
            <View className="items-center justify-center mt-16 px-8">
              <Briefcase size={56} color="#CBD5E1" />
              <Text className="text-center text-gray-500 font-bold mt-4 text-lg">No field jobs assigned</Text>
              <Text className="text-center text-gray-400 text-sm mt-2 leading-relaxed">Any municipal repair tasks assigned to your contractor account will appear here.</Text>
            </View>
          ) : (
            workOrders.map((wo) => (
              <View key={wo.id} className="bg-white rounded-[26px] p-5 mb-5 shadow-sm border border-gray-100" style={{ elevation: 2 }}>
                <View className="flex-row items-center justify-between mb-3.5">
                  <View className={`border px-3 py-1 rounded-full ${getStatusColor(wo.status)}`}>
                    <Text className="text-[10px] font-black uppercase tracking-wider">{wo.status}</Text>
                  </View>
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Work Order</Text>
                </View>

                <Text className="text-lg font-black text-gray-900 mb-1.5 leading-tight">{wo.demand_title}</Text>
                {wo.demand_description && (
                  <Text className="text-gray-500 font-medium text-sm mb-4 leading-relaxed">{wo.demand_description}</Text>
                )}

                {/* Contract Cost Transparency display */}
                {wo.estimated_cost && (
                  <View className="bg-indigo-50/50 border border-indigo-100 px-4 py-3 rounded-2xl flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center">
                      <ClipboardList size={15} color="#4F46E5" />
                      <Text className="text-xs text-indigo-700 font-black ml-2 uppercase">Contract Cost</Text>
                    </View>
                    <Text className="text-sm font-black text-indigo-650">₹{Number(wo.estimated_cost).toLocaleString()}</Text>
                  </View>
                )}

                {/* Before evidence photo for contractor */}
                {wo.evidence_before && wo.evidence_before.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-black text-gray-400 uppercase mb-2 tracking-wider">Pothole/Issue Reference Photo</Text>
                    <Image
                      source={{ uri: wo.evidence_before[0].startsWith('http') ? wo.evidence_before[0] : `${apiClient.defaults.baseURL?.replace('/api/v1', '')}${wo.evidence_before[0]}` }}
                      className="w-full h-36 rounded-xl bg-gray-100 border border-gray-100"
                      resizeMode="cover"
                    />
                  </View>
                )}

                {/* Action buttons for contractor */}
                {wo.status === 'assigned' && (
                  <TouchableOpacity
                    onPress={() => handleStartWork(wo.id)}
                    className="bg-brand-blue py-3.5 rounded-2xl flex-row items-center justify-center shadow-md"
                    style={{ shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                  >
                    <Play size={16} color="white" fill="white" />
                    <Text className="text-white font-black text-sm ml-2">Start Repair Work</Text>
                  </TouchableOpacity>
                )}

                {wo.status === 'in_progress' && (
                  <TouchableOpacity
                    onPress={() => {
                      setActiveWO(wo);
                      setResolutionModalVisible(true);
                    }}
                    className="bg-emerald-600 py-3.5 rounded-2xl flex-row items-center justify-center shadow-md"
                    style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                  >
                    <CheckCircle size={16} color="white" />
                    <Text className="text-white font-black text-sm ml-2">Complete and Upload Proof</Text>
                  </TouchableOpacity>
                )}

                {wo.status === 'completed' && (
                  <View className="bg-orange-50 border border-orange-100 p-3 rounded-2xl flex-row items-center justify-center">
                    <Text className="text-orange-600 font-extrabold text-xs">Awaiting Citizen Verification Audit ⏳</Text>
                  </View>
                )}

                {wo.status === 'verified' && (
                  <View className="bg-green-50 border border-green-100 p-3 rounded-2xl flex-row items-center justify-center">
                    <Text className="text-green-700 font-extrabold text-xs">Job Closed - Verified Resolved 🎉</Text>
                  </View>
                )}
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Resolution Submission Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={resolutionModalVisible}
        onRequestClose={() => setResolutionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-[36px] p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-5 border-b border-gray-50 pb-3">
              <Text className="text-lg font-black text-gray-900">Upload Resolution Proof</Text>
              <TouchableOpacity onPress={() => setResolutionModalVisible(false)}>
                <Text className="text-sm text-gray-400 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Description */}
              <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Resolution Notes</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-5 min-h-[100px]">
                <TextInput
                  placeholder="Describe the repair done (e.g. patched pothole, cleared all garbage piles)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  className="text-gray-800 text-sm leading-relaxed"
                  value={resolutionNotes}
                  onChangeText={setResolutionNotes}
                />
              </View>

              {/* Photo Evidence */}
              <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">After Evidence Photo</Text>
              {resolutionPhoto ? (
                <View className="mb-5 relative rounded-2xl overflow-hidden border border-gray-200">
                  <Image source={{ uri: resolutionPhoto }} className="w-full h-48 bg-gray-100" resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => setResolutionPhoto(null)}
                    className="absolute top-3 right-3 bg-black/60 w-8 h-8 rounded-full items-center justify-center"
                  >
                    <Text className="text-white font-extrabold text-xs">X</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row mb-5">
                  <TouchableOpacity
                    onPress={() => handlePickResolutionPhoto(true)}
                    className="flex-1 bg-orange-50 border border-brand-orange/20 p-5 rounded-2xl items-center mr-2"
                  >
                    <Camera size={24} color="#FF7E67" />
                    <Text className="text-brand-orange font-bold text-xs mt-1.5">Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handlePickResolutionPhoto(false)}
                    className="flex-1 bg-gray-50 border border-gray-200 p-5 rounded-2xl items-center ml-2"
                  >
                    <LucideImage size={24} color="#6B7280" />
                    <Text className="text-gray-500 font-bold text-xs mt-1.5">Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleCompleteWork}
                disabled={completingTask}
                className="bg-emerald-600 py-4 rounded-2xl items-center justify-center flex-row shadow-md"
                style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 }}
              >
                {completingTask ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#FFF" />
                    <Text className="text-white font-black text-base ml-2">Submit Proof & Resolve</Text>
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


