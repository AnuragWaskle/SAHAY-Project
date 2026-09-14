import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList, Alert } from 'react-native';
import { ChevronLeft, Zap, Award, Gift, TrendingUp, Shield, Star, Clock, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../api/client';

const ACTION_LABELS: Record<string, string> = {
  report_submitted: 'Report Submitted',
  report_with_evidence: 'Quality Evidence',
  report_verified_incident: 'Verified Incident',
  verification_helpful: 'Helpful Verification',
  mission_participate: 'Mission Participation',
  volunteer_complete: 'Volunteer Completed',
  resolution_verify: 'Resolution Verified',
  initiative_success: 'Initiative Success',
  referral_active: 'Referral Activated',
  community_contribution: 'Community Info',
  redemption: 'Reward Redeemed',
  admin_adjustment: 'Admin Adjustment',
};

export default function ImpactWalletScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [trustLogs, setTrustLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalEarned: 0, totalRedeemed: 0, missionsCompleted: 0, volunteerHours: 0 });

  // Rewards shop states
  const [activeSubTab, setActiveSubTab] = useState<'activity' | 'rewards'>('activity');
  const [rewards, setRewards] = useState<any[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const [level, setLevel] = useState(1);
  const [trustScore, setTrustScore] = useState(50);

  const fetchRewards = async () => {
    setLoadingRewards(true);
    try {
      const res = await apiClient.get('/credits/rewards');
      if (res.data?.success) {
        setRewards(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRewards(false);
    }
  };

  const handleRedeem = async (rewardId: string, cost: number, name: string) => {
    if (balance < cost) {
      Alert.alert('Insufficient Balance', `You need ${cost} credits to redeem this reward.`);
      return;
    }
    setRedeemingId(rewardId);
    try {
      const res = await apiClient.post('/credits/redeem', { rewardId });
      if (res.data?.success) {
        Alert.alert(
          'Redemption Successful! 🎉',
          `${res.data.message}\n\nPresent this code to claim:\n${res.data.data.redemption_code}`
        );
        fetchData();
        fetchRewards();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Redemption failed');
    } finally {
      setRedeemingId(null);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, trustRes, profileRes, logsRes] = await Promise.all([
        apiClient.get('/credits/balance').catch(() => ({ data: { data: null } })),
        apiClient.get('/fraud/trust/me').catch(() => ({ data: { data: null } })),
        apiClient.get('/users/me').catch(() => ({ data: { data: null } })),
        apiClient.get('/fraud/flags/me').catch(() => ({ data: { data: null } })),
      ]);

      const balanceData = balanceRes.data?.data;
      if (balanceData) {
        setBalance(balanceData.balance || 0);
        setTransactions(balanceData.recent_transactions || []);
        setStats({
          totalEarned: balanceData.total_earned || 0,
          totalRedeemed: balanceData.total_redeemed || 0,
          missionsCompleted: balanceData.missions_completed || 0,
          volunteerHours: balanceData.volunteer_hours || 0,
        });
      }

      if (logsRes?.data?.success) {
        setTrustLogs(logsRes.data.data);
      }

      const trustData = trustRes.data?.data;
      if (trustData) {
        setTrustScore(Number(trustData.score) || 50);
      }

      const profile = profileRes.data?.data;
      if (profile) {
        setLevel(profile.level || 1);
        if (!balanceData) setBalance(profile.civic_credits || 0);
      }
    } catch (err) {
      console.error('Failed to fetch wallet data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getTrustColor = () => {
    if (trustScore >= 80) return '#16A34A';
    if (trustScore >= 60) return '#D97706';
    if (trustScore >= 40) return '#EA580C';
    return '#DC2626';
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#16A34A" />
        <Text className="mt-4 text-gray-500 font-medium">Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#16A34A" />}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <View
        className="bg-emerald-600 pt-14 pb-20 px-6"
        style={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white/80 font-bold text-sm">Impact Wallet</Text>
          <View className="w-6" />
        </View>

        {/* Balance */}
        <View className="items-center">
          <Text className="text-white/60 font-bold text-xs uppercase tracking-widest mb-1">Civic Credits</Text>
          <Text className="text-5xl font-black text-white">{balance.toLocaleString()}</Text>
          <View className="flex-row items-center mt-3 bg-white/15 px-4 py-2 rounded-2xl">
            <Star size={14} color="#FFF" fill="#FFF" />
            <Text className="text-white font-bold ml-1.5 text-sm">Level {level} Contributor</Text>
          </View>
        </View>
      </View>

      {/* Trust Score Card - overlapping */}
      <View
        className="mx-5 bg-white p-4 rounded-[22px] flex-row items-center"
        style={{ marginTop: -24, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }}
      >
        <View className="flex-1">
          <Text className="text-xs font-bold text-gray-400 uppercase">Civic Trust Score</Text>
          <View className="flex-row items-end mt-1">
            <Text className="text-2xl font-black" style={{ color: getTrustColor() }}>{Math.round(trustScore)}</Text>
            <Text className="text-gray-400 font-bold text-sm ml-1 mb-0.5">/100</Text>
          </View>
        </View>
        <View className="w-16 h-16 rounded-2xl items-center justify-center" style={{ backgroundColor: getTrustColor() + '15' }}>
          <Shield size={24} color={getTrustColor()} />
        </View>
      </View>

      {/* Quick Stats */}
      <View className="flex-row px-5 mt-5">
        <View
          className="flex-1 bg-white p-4 rounded-[18px] mr-2 items-center"
          style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
        >
          <Zap size={16} color="#16A34A" />
          <Text className="text-lg font-black text-gray-800 mt-1">{stats.totalEarned.toLocaleString()}</Text>
          <Text className="text-gray-400 text-[9px] font-bold uppercase">Earned</Text>
        </View>
        <View
          className="flex-1 bg-white p-4 rounded-[18px] mx-1 items-center"
          style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
        >
          <Gift size={16} color="#8B5CF6" />
          <Text className="text-lg font-black text-gray-800 mt-1">{stats.totalRedeemed.toLocaleString()}</Text>
          <Text className="text-gray-400 text-[9px] font-bold uppercase">Redeemed</Text>
        </View>
        <View
          className="flex-1 bg-white p-4 rounded-[18px] ml-2 items-center"
          style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
        >
          <Award size={16} color="#D97706" />
          <Text className="text-lg font-black text-gray-800 mt-1">{stats.missionsCompleted}</Text>
          <Text className="text-gray-400 text-[9px] font-bold uppercase">Missions</Text>
        </View>
      </View>

      {/* Actions */}
      <View className="px-5 mt-6">
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => navigation.navigate('RewardMarketplace')}
            className="flex-1 bg-emerald-600 py-4 rounded-[18px] items-center mr-2 flex-row justify-center"
            style={{ elevation: 4, shadowColor: '#16A34A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 }}
          >
            <Gift size={18} color="#FFF" />
            <Text className="text-white font-black text-sm ml-2">Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Act')}
            className="flex-1 bg-blue-600 py-4 rounded-[18px] items-center ml-2 flex-row justify-center"
            style={{ elevation: 4, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 }}
          >
            <TrendingUp size={18} color="#FFF" />
            <Text className="text-white font-black text-sm ml-2">Earn More</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* How to Earn */}
      <View className="px-5 mt-6">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">How to Earn</Text>
        <View
          className="bg-white p-5 rounded-[22px]"
          style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
        >
          {[
            { action: 'Report an issue', points: '+5', icon: '📝' },
            { action: 'Provide evidence', points: '+8', icon: '📸' },
            { action: 'Verify resolution', points: '+15', icon: '✅' },
            { action: 'Complete mission', points: '+25', icon: '🎯' },
            { action: 'Volunteer activity', points: '+50', icon: '🤝' },
          ].map((item, idx) => (
            <View key={idx} className={`flex-row items-center py-3 ${idx < 4 ? 'border-b border-gray-50' : ''}`}>
              <Text className="text-lg mr-3">{item.icon}</Text>
              <Text className="flex-1 font-bold text-gray-700 text-sm">{item.action}</Text>
              <View className="bg-green-50 px-3 py-1 rounded-xl">
                <Text className="font-black text-green-700 text-xs">{item.points}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Subtab Selector */}
      <View className="flex-row bg-gray-200/50 p-1.5 rounded-2xl mx-5 mt-6 mb-2">
        <TouchableOpacity
          onPress={() => setActiveSubTab('activity')}
          className={`flex-1 py-3 rounded-xl items-center ${activeSubTab === 'activity' ? 'bg-white shadow-sm' : ''}`}
        >
          <Text className={`text-[10px] font-black uppercase tracking-wider ${activeSubTab === 'activity' ? 'text-brand-orange' : 'text-gray-500'}`}>Activity Log</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveSubTab('rewards');
            fetchRewards();
          }}
          className={`flex-1 py-3 rounded-xl items-center ${activeSubTab === 'rewards' ? 'bg-white shadow-sm' : ''}`}
        >
          <Text className={`text-[10px] font-black uppercase tracking-wider ${activeSubTab === 'rewards' ? 'text-brand-orange' : 'text-gray-500'}`}>Redeem Rewards</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle View Content */}
      <View className="px-5 mt-4">
        {activeSubTab === 'activity' ? (
          transactions.length === 0 ? (
            <View
              className="bg-white p-6 rounded-[22px] items-center"
              style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
            >
              <Clock size={32} color="#CBD5E1" />
              <Text className="text-gray-400 font-bold text-sm mt-3">No transactions yet</Text>
              <Text className="text-gray-300 font-medium text-xs mt-1">Start earning by reporting issues!</Text>
            </View>
          ) : (
            <View
              className="bg-white rounded-[22px] overflow-hidden"
              style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
            >
              {transactions.slice(0, 15).map((tx: any, idx: number) => (
                <View key={tx.id || idx} className={`flex-row items-center px-5 py-3.5 ${idx < transactions.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <View className={`w-8 h-8 rounded-xl items-center justify-center ${tx.credits > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    {tx.credits > 0 ? <TrendingUp size={14} color="#16A34A" /> : <Gift size={14} color="#DC2626" />}
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-bold text-gray-800 text-sm">{ACTION_LABELS[tx.action] || tx.action}</Text>
                    <Text className="text-gray-400 text-[10px] font-medium mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className={`font-black text-sm ${tx.credits > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.credits > 0 ? '+' : ''}{tx.credits}
                  </Text>
                </View>
              ))}
            </View>
          )
        ) : (
          /* Rewards Store Catalog */
          loadingRewards ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="small" color="#FF7E67" />
            </View>
          ) : rewards.length === 0 ? (
            <View className="bg-white p-6 rounded-[22px] items-center">
              <Text className="text-gray-400 font-bold text-xs">No active rewards available right now.</Text>
            </View>
          ) : (
            <View className="space-y-4">
              {rewards.map((reward: any) => (
                <View
                  key={reward.id}
                  className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex-row items-center justify-between"
                  style={{ elevation: 2 }}
                >
                  <View className="flex-1 mr-4">
                    <Text className="font-extrabold text-gray-850 text-sm leading-tight mb-1">{reward.name}</Text>
                    <Text className="text-xs text-gray-500 font-medium leading-relaxed">{reward.description}</Text>
                    <Text className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wider">Stock: {reward.stock || 'Unlimited'}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRedeem(reward.id, reward.points_required, reward.name)}
                    disabled={redeemingId === reward.id}
                    className="bg-brand-orange px-4 py-2.5 rounded-xl items-center justify-center flex-row shadow-sm"
                  >
                    {redeemingId === reward.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Gift size={13} color="#FFF" />
                        <Text className="text-white font-black text-xs ml-1.5">{reward.points_required} CC</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )
        )}
      </View>

      {/* Integrity & Trust Audit Log */}
      <View className="px-5 mt-6 mb-8">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Integrity & Trust Log</Text>
        {trustLogs.length === 0 ? (
          <View
            className="bg-white p-5 rounded-[22px] items-center"
            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
          >
            <Shield size={28} color="#CBD5E1" />
            <Text className="text-gray-400 font-bold text-xs mt-2.5">Your record is fully clean! No integrity flags.</Text>
          </View>
        ) : (
          <View
            className="bg-white rounded-[22px] overflow-hidden"
            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
          >
            {trustLogs.map((log: any, idx: number) => (
              <View key={log.id || idx} className={`px-5 py-4 ${idx < trustLogs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="font-extrabold text-gray-800 text-sm capitalize">{log.flag_type.replace('_', ' ')}</Text>
                  <View className={`px-2 py-0.5 rounded-md border ${
                    log.status === 'confirmed' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                  }`}>
                    <Text className={`text-[9px] font-black uppercase ${
                      log.status === 'confirmed' ? 'text-red-600' : 'text-yellow-600'
                    }`}>{log.status}</Text>
                  </View>
                </View>
                <Text className="text-xs text-gray-500 leading-relaxed">{log.description}</Text>
                <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-50/50">
                  <Text className="text-[10px] text-gray-400 font-bold">Severity: {log.severity}</Text>
                  {log.action_taken && log.action_taken !== 'none' && (
                    <Text className="text-[10px] text-red-500 font-black uppercase">Action: {log.action_taken.replace('_', ' ')}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
