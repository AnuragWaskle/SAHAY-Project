import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { ChevronLeft, Heart, Users, Target, Calendar, DollarSign, TrendingUp, CheckCircle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../api/client';

export default function InitiativeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { initiativeId } = route.params;
  const [initiative, setInitiative] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contributing, setContributing] = useState(false);
  const [showContributeForm, setShowContributeForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [contributionType, setContributionType] = useState<'money' | 'time' | 'materials'>('money');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get(`/initiatives/${initiativeId}`);
        setInitiative(res.data.data);
      } catch (e) {
        console.error('Failed to load initiative', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [initiativeId]);

  const handleContribute = async () => {
    if (!amount.trim()) {
      Alert.alert('Required', 'Please enter an amount or hours.');
      return;
    }
    setContributing(true);
    try {
      await apiClient.post(`/initiatives/${initiativeId}/contribute`, {
        type: contributionType,
        amount: parseFloat(amount),
      });
      Alert.alert('Thank you!', `Your ${contributionType} contribution has been recorded. +5 Civic Points!`);
      setShowContributeForm(false);
      setAmount('');
      const res = await apiClient.get(`/initiatives/${initiativeId}`);
      setInitiative(res.data.data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to contribute');
    } finally {
      setContributing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  if (!initiative) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA] px-8">
        <Text className="text-gray-500 text-lg font-medium text-center">Initiative not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6 bg-green-600 px-6 py-3 rounded-2xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressPercent = initiative.goal_amount
    ? Math.min(100, Math.round((Number(initiative.current_amount || 0) / Number(initiative.goal_amount)) * 100))
    : 0;

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View
        className="bg-green-600 pt-14 pb-16 px-6"
        style={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <View className="flex-row items-center mb-2">
          <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center mr-3">
            <Heart size={20} color="#FFF" />
          </View>
          <Text className="text-white/80 font-bold text-sm">{initiative.org_name || 'Initiative'}</Text>
        </View>
        <Text className="text-2xl font-black text-white leading-tight">{initiative.title}</Text>
      </View>

      {/* Status + Contributors */}
      <View
        className="mx-5 bg-white p-4 rounded-[22px] flex-row items-center justify-between"
        style={{ marginTop: -24, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }}
      >
        <View className="px-3 py-1.5 rounded-xl bg-green-50">
          <Text className="font-black text-xs text-green-700 capitalize">{initiative.status || 'active'}</Text>
        </View>
        <View className="flex-row items-center">
          <Users size={14} color="#6B7280" />
          <Text className="ml-1 font-bold text-gray-600 text-sm">{initiative.contributor_count || 0} contributors</Text>
        </View>
      </View>

      {/* Description */}
      <View
        className="mx-5 mt-4 bg-white p-5 rounded-[22px]"
        style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 }}
      >
        <Text className="text-gray-600 font-medium leading-relaxed text-sm">{initiative.description}</Text>
        {initiative.category && (
          <View className="flex-row items-center mt-3 pt-3 border-t border-gray-50">
            <Target size={14} color="#6B7280" />
            <Text className="ml-2 text-gray-500 font-medium text-xs capitalize">{initiative.category}</Text>
          </View>
        )}
        {initiative.deadline && (
          <View className="flex-row items-center mt-2">
            <Calendar size={14} color="#6B7280" />
            <Text className="ml-2 text-gray-500 font-medium text-xs">Deadline: {new Date(initiative.deadline).toLocaleDateString()}</Text>
          </View>
        )}
      </View>

      {/* Funding Progress */}
      {initiative.goal_amount && (
        <View className="mx-5 mt-5">
          <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Funding Progress</Text>
          <View
            className="bg-white p-5 rounded-[22px]"
            style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <View className="flex-row items-end justify-between mb-3">
              <View>
                <Text className="text-2xl font-black text-green-600">
                  {Number(initiative.current_amount || 0).toLocaleString()}
                </Text>
                <Text className="text-gray-400 text-[10px] font-bold uppercase">raised</Text>
              </View>
              <View className="items-end">
                <Text className="text-lg font-bold text-gray-800">
                  {Number(initiative.goal_amount).toLocaleString()}
                </Text>
                <Text className="text-gray-400 text-[10px] font-bold uppercase">goal</Text>
              </View>
            </View>
            <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full bg-green-500"
                style={{ width: `${progressPercent}%` }}
              />
            </View>
            <Text className="text-center font-black text-green-700 text-sm mt-2">{progressPercent}%</Text>
          </View>
        </View>
      )}

      {/* Impact Stats */}
      <View className="mx-5 mt-5">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Impact</Text>
        <View className="flex-row">
          <View
            className="flex-1 bg-white p-4 rounded-[20px] mr-2 items-center"
            style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }}
          >
            <DollarSign size={18} color="#16A34A" />
            <Text className="text-lg font-black text-gray-800 mt-1">{initiative.money_raised || 0}</Text>
            <Text className="text-gray-400 text-[9px] font-bold uppercase">Money</Text>
          </View>
          <View
            className="flex-1 bg-white p-4 rounded-[20px] mx-1 items-center"
            style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }}
          >
            <TrendingUp size={18} color="#3B82F6" />
            <Text className="text-lg font-black text-gray-800 mt-1">{initiative.hours_contributed || 0}</Text>
            <Text className="text-gray-400 text-[9px] font-bold uppercase">Hours</Text>
          </View>
          <View
            className="flex-1 bg-white p-4 rounded-[20px] ml-2 items-center"
            style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }}
          >
            <Users size={18} color="#8B5CF6" />
            <Text className="text-lg font-black text-gray-800 mt-1">{initiative.volunteer_count || 0}</Text>
            <Text className="text-gray-400 text-[9px] font-bold uppercase">Volunteers</Text>
          </View>
        </View>
      </View>

      {/* Contribute Section */}
      <View className="mx-5 mt-6">
        {!showContributeForm ? (
          <TouchableOpacity
            onPress={() => setShowContributeForm(true)}
            className="py-4 rounded-[20px] items-center flex-row justify-center bg-green-600"
            style={{ elevation: 6, shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }}
          >
            <Heart size={20} color="#FFF" />
            <Text className="text-white font-black text-base ml-2">Contribute</Text>
          </TouchableOpacity>
        ) : (
          <View
            className="bg-white p-5 rounded-[22px]"
            style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 }}
          >
            <Text className="font-black text-gray-800 text-base mb-4">Make a Contribution</Text>

            {/* Type selector */}
            <View className="flex-row mb-4">
              {(['money', 'time', 'materials'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setContributionType(type)}
                  className={`flex-1 py-2.5 rounded-xl items-center mx-1 ${contributionType === type ? 'bg-green-600' : 'bg-gray-50 border border-gray-100'}`}
                >
                  <Text className={`text-xs font-bold capitalize ${contributionType === type ? 'text-white' : 'text-gray-600'}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount input */}
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={contributionType === 'time' ? 'Hours (e.g. 4)' : 'Amount (e.g. 500)'}
              keyboardType="numeric"
              className="bg-gray-50 px-4 py-3 rounded-xl font-bold text-gray-800 border border-gray-100 mb-4"
              placeholderTextColor="#9CA3AF"
            />

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => { setShowContributeForm(false); setAmount(''); }}
                className="flex-1 py-3 rounded-xl items-center mr-2 bg-gray-100"
              >
                <Text className="font-bold text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleContribute}
                disabled={contributing}
                className="flex-1 py-3 rounded-xl items-center ml-2 bg-green-600"
              >
                {contributing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="font-bold text-white">Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
