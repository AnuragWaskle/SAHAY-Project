import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { ChevronLeft, Megaphone, Users, Clock, CheckCircle, ArrowRight, MapPin, Shield, TrendingUp, Sparkles } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Modal, TextInput } from 'react-native';
import apiClient from '../api/client';

const STAGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  proposed: { label: 'Proposed', color: '#6B7280', bg: '#F3F4F6' },
  community_supported: { label: 'Community Supported', color: '#D97706', bg: '#FEF3C7' },
  submitted: { label: 'Submitted', color: '#2563EB', bg: '#DBEAFE' },
  accepted: { label: 'Accepted', color: '#059669', bg: '#D1FAE5' },
  work_planned: { label: 'Work Planned', color: '#7C3AED', bg: '#EDE9FE' },
  in_progress: { label: 'In Progress', color: '#EA580C', bg: '#FED7AA' },
  completed: { label: 'Completed', color: '#16A34A', bg: '#BBF7D0' },
  citizen_verification: { label: 'Citizen Verification', color: '#0891B2', bg: '#CFFAFE' },
  resolved: { label: 'Resolved', color: '#059669', bg: '#D1FAE5' },
  reopened: { label: 'Reopened', color: '#DC2626', bg: '#FEE2E2' },
};

const ALL_STAGES = [
  'proposed', 'community_supported', 'submitted', 'accepted',
  'work_planned', 'in_progress', 'completed', 'citizen_verification', 'resolved'
];

export default function DemandDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { demandId } = route.params;
  const [demand, setDemand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supporting, setSupporting] = useState(false);
  const [supported, setSupported] = useState(false);
  
  // Boosting states
  const [boostModalVisible, setBoostModalVisible] = useState(false);
  const [boostCreditsInput, setBoostCreditsInput] = useState('10');
  const [boosting, setBoosting] = useState(false);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  const fetchDemand = async () => {
    try {
      const [res, woRes] = await Promise.all([
        apiClient.get(`/demands/${demandId}`),
        apiClient.get(`/work-orders?demand_id=${demandId}`).catch(() => ({ data: { data: [] } }))
      ]);
      setDemand(res.data.data);
      if (woRes.data?.success) {
        setWorkOrders(woRes.data.data);
      }
    } catch (e) {
      console.error('Failed to load demand', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemand();
  }, [demandId]);

  const handleSupport = async () => {
    if (supported) return;
    setSupporting(true);
    try {
      await apiClient.post(`/demands/${demandId}/support`);
      setSupported(true);
      setDemand((prev: any) => ({ ...prev, supporters_count: (prev.supporters_count || 0) + 1 }));
      Alert.alert('Supported!', 'Thank you for supporting this demand. +2 Civic Points!');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to support demand');
    } finally {
      setSupporting(false);
    }
  };

  const handleBoost = async () => {
    const amount = parseInt(boostCreditsInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive number of credits.');
      return;
    }
    setBoosting(true);
    try {
      const res = await apiClient.post(`/demands/${demandId}/boost`, { credits: amount });
      if (res.data?.success) {
        Alert.alert('Project Boosted! 🚀', res.data.message);
        setBoostModalVisible(false);
        setBoostCreditsInput('10');
        await fetchDemand();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to boost project';
      Alert.alert('Error', msg);
    } finally {
      setBoosting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!demand) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA] px-8">
        <Text className="text-gray-500 text-lg font-medium text-center">Demand not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6 bg-brand-orange px-6 py-3 rounded-2xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stageInfo = STAGE_LABELS[demand.stage] || STAGE_LABELS.proposed;
  const currentStageIdx = ALL_STAGES.indexOf(demand.stage);

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View
        className="bg-blue-600 pt-14 pb-16 px-6"
        style={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <View className="flex-row items-center mb-2">
          <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center mr-3">
            <Megaphone size={20} color="#FFF" />
          </View>
          <Text className="text-white/80 font-bold text-sm">Civic Demand</Text>
        </View>
        <Text className="text-2xl font-black text-white leading-tight">{demand.title}</Text>
      </View>

      {/* Status Badge - overlapping */}
      <View
        className="mx-5 bg-white p-4 rounded-[22px] flex-row items-center justify-between"
        style={{ marginTop: -24, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }}
      >
        <View className="flex-row items-center">
          <View className="px-3 py-1.5 rounded-xl" style={{ backgroundColor: stageInfo.bg }}>
            <Text className="font-black text-xs" style={{ color: stageInfo.color }}>{stageInfo.label}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Users size={14} color="#6B7280" />
          <Text className="ml-1 font-bold text-gray-600 text-sm">{demand.supporters_count || 0} supporters</Text>
        </View>
      </View>

      {/* Description */}
      <View
        className="mx-5 mt-4 bg-white p-5 rounded-[22px]"
        style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 }}
      >
        <Text className="text-gray-600 font-medium leading-relaxed text-sm">{demand.description}</Text>
        {demand.ward_name && (
          <View className="flex-row items-center mt-3 pt-3 border-t border-gray-50">
            <MapPin size={14} color="#6B7280" />
            <Text className="ml-2 text-gray-500 font-medium text-xs">{demand.ward_name}{demand.city_name ? `, ${demand.city_name}` : ''}</Text>
          </View>
        )}
        {demand.department_name && (
          <View className="flex-row items-center mt-2">
            <Shield size={14} color="#6B7280" />
            <Text className="ml-2 text-gray-500 font-medium text-xs">Assigned: {demand.department_name}</Text>
          </View>
        )}
      </View>

      {/* Crowdfunding & Matched Funding Card */}
      <View
        className="mx-5 mt-4 bg-white p-5 rounded-[22px] border border-gray-100 shadow-sm"
        style={{ elevation: 3 }}
      >
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3.5">Matched CSR Funding</Text>
        <View className="flex-row items-center mb-4">
          <View className="w-11 h-11 bg-emerald-50 rounded-2xl items-center justify-center mr-3 border border-emerald-100">
            <TrendingUp size={20} color="#16A34A" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-gray-400 uppercase">CSR Matching Pool Payout</Text>
            <Text className="text-xl font-black text-emerald-600 mt-0.5">₹{Number(demand.matching_fund || 0).toLocaleString()}</Text>
          </View>
          <View className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl">
            <Text className="text-emerald-700 text-xs font-black">10x Match</Text>
          </View>
        </View>
        
        <View className="flex-row items-center pt-3 border-t border-gray-50">
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-gray-400 uppercase">Citizen Points Boosted</Text>
            <Text className="text-base font-black text-gray-800 mt-0.5">{demand.boost_credits || 0} Credits</Text>
          </View>
          <TouchableOpacity
            onPress={() => setBoostModalVisible(true)}
            className="bg-brand-orange px-4 py-2.5 rounded-xl shadow-sm"
          >
            <Text className="text-white font-extrabold text-xs">🚀 Boost Project</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Municipal Work Orders & Bids Ledger */}
      {workOrders.length > 0 && (
        <View
          className="mx-5 mt-4 bg-white p-5 rounded-[22px] border border-gray-100 shadow-sm"
          style={{ elevation: 3 }}
        >
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Municipal Bid & Cost Ledger</Text>
          {workOrders.map((wo: any, idx: number) => (
            <View key={wo.id || idx} className={`${idx > 0 ? 'border-t border-gray-50 pt-3 mt-3' : ''}`}>
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-xs font-bold text-gray-800">Job Reference: {wo.id.slice(0, 8).toUpperCase()}</Text>
                <View className={`px-2 py-0.5 rounded-md border ${
                  wo.status === 'completed' || wo.status === 'verified' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'
                }`}>
                  <Text className={`text-[9px] font-black uppercase ${
                    wo.status === 'completed' || wo.status === 'verified' ? 'text-green-700' : 'text-blue-600'
                  }`}>{wo.status}</Text>
                </View>
              </View>
              <div className="flex-row justify-between items-center">
                <Text className="text-xs text-gray-400 font-bold">Allocated Public Budget:</Text>
                <Text className="text-sm font-black text-indigo-650">₹{Number(wo.estimated_cost || 0).toLocaleString()}</Text>
              </div>
              {wo.notes && (
                <Text className="text-[11px] text-gray-500 font-medium mt-1 leading-normal">Instructions: {wo.notes}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Progress Pipeline */}
      <View className="mx-5 mt-5">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Progress</Text>
        <View
          className="bg-white p-5 rounded-[22px]"
          style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 }}
        >
          {ALL_STAGES.map((stage, idx) => {
            const info = STAGE_LABELS[stage];
            const isActive = idx === currentStageIdx;
            const isPast = idx < currentStageIdx;
            const isFuture = idx > currentStageIdx;

            return (
              <View key={stage} className="flex-row items-center mb-1">
                <View className="items-center w-8">
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center ${isPast ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-200'}`}
                  >
                    {isPast && <CheckCircle size={12} color="#FFF" />}
                    {isActive && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                  {idx < ALL_STAGES.length - 1 && (
                    <View className={`w-0.5 h-5 ${isPast ? 'bg-green-300' : 'bg-gray-200'}`} />
                  )}
                </View>
                <Text
                  className={`ml-3 text-xs font-bold ${isActive ? 'text-blue-700' : isPast ? 'text-green-700' : 'text-gray-400'}`}
                >
                  {info?.label || stage}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Timeline */}
      {demand.timeline && demand.timeline.length > 0 && (
        <View className="mx-5 mt-5">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Timeline</Text>
          <View
            className="bg-white p-5 rounded-[22px]"
            style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            {demand.timeline.map((entry: any, idx: number) => (
              <View key={entry.id || idx} className="flex-row mb-3 last:mb-0">
                <View className="items-center mr-3">
                  <View className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                  {idx < demand.timeline.length - 1 && <View className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                </View>
                <View className="flex-1 pb-3">
                  <View className="flex-row items-center">
                    <ArrowRight size={10} color="#6B7280" />
                    <Text className="ml-1 text-xs font-bold text-gray-700">
                      {STAGE_LABELS[entry.stage_to]?.label || entry.stage_to}
                    </Text>
                  </View>
                  {entry.note && <Text className="text-gray-500 text-xs mt-0.5">{entry.note}</Text>}
                  <Text className="text-gray-300 text-[10px] mt-0.5">
                    {entry.actor_name ? `by ${entry.actor_name} • ` : ''}
                    {new Date(entry.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Verification Summary */}
      {demand.verification_summary && demand.verification_summary.total > 0 && (
        <View className="mx-5 mt-5">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Citizen Verification</Text>
          <View
            className="bg-white p-5 rounded-[22px]"
            style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text className="text-xl font-black text-green-600">{demand.verification_summary.solved}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase">Solved</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-black text-yellow-600">{demand.verification_summary.partially}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase">Partial</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-black text-red-600">{demand.verification_summary.not_solved}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase">Not Solved</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Support Button */}
      <View className="mx-5 mt-6">
        <TouchableOpacity
          onPress={handleSupport}
          disabled={supported || supporting}
          className={`py-4 rounded-[20px] items-center flex-row justify-center ${supported ? 'bg-green-500' : 'bg-blue-600'}`}
          style={{ elevation: 6, shadowColor: supported ? '#16A34A' : '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }}
        >
          {supporting ? (
            <ActivityIndicator color="white" size="small" />
          ) : supported ? (
            <CheckCircle size={20} color="#FFF" />
          ) : (
            <Megaphone size={20} color="#FFF" />
          )}
          <Text className="text-white font-black text-base ml-2">
            {supported ? 'Supported!' : 'Support This Demand'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Boost Project Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={boostModalVisible}
        onRequestClose={() => setBoostModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[36px] p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-5 border-b border-gray-50 pb-3">
              <Text className="text-lg font-black text-gray-900">Boost Civic Project</Text>
              <TouchableOpacity onPress={() => setBoostModalVisible(false)}>
                <Text className="text-sm text-gray-400 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 text-sm leading-relaxed mb-5">
              Dedicate your earned Civic Credits to boost the priority of this project. Sponsoring corporations will match your points 10x with CSR capital to get it funded!
            </Text>

            {/* Input */}
            <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Credits to allocate</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 flex-row items-center mb-5">
              <TextInput
                keyboardType="numeric"
                className="flex-1 py-1 text-base font-bold text-gray-800"
                value={boostCreditsInput}
                onChangeText={setBoostCreditsInput}
              />
              <Text className="text-gray-400 font-bold text-xs ml-2">Credits</Text>
            </View>

            {/* Matching Multiplier Callout */}
            {parseInt(boostCreditsInput) > 0 && (
              <View className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex-row items-center mb-6">
                <Sparkles size={20} color="#16A34A" />
                <Text className="text-emerald-700 text-xs font-extrabold ml-2.5 flex-1">
                  Matches ₹{parseInt(boostCreditsInput) * 10} in matching CSR cash towards resolving this issue!
                </Text>
              </View>
            )}

            {/* Confirm button */}
            <TouchableOpacity
              onPress={handleBoost}
              disabled={boosting}
              className="bg-brand-orange py-4 rounded-2xl items-center justify-center flex-row shadow-md"
              style={{ shadowColor: '#FF7E67', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 }}
            >
              {boosting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Sparkles size={16} color="#FFF" />
                  <Text className="text-white font-black text-base ml-2">Confirm Boost</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
