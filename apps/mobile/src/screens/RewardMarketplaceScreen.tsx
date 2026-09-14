import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { ChevronLeft, Gift, Award, Star, Leaf, BookOpen, Ticket, CheckCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../api/client';

const CATEGORY_ICONS: Record<string, any> = {
  voucher: Ticket,
  certificate: Award,
  experience: Star,
  environmental: Leaf,
  education: BookOpen,
  partner: Gift,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  voucher: { bg: '#FEF3C7', text: '#D97706' },
  certificate: { bg: '#EDE9FE', text: '#7C3AED' },
  experience: { bg: '#FEE2E2', text: '#DC2626' },
  environmental: { bg: '#D1FAE5', text: '#059669' },
  education: { bg: '#DBEAFE', text: '#2563EB' },
  partner: { bg: '#FFF0ED', text: '#FF7E67' },
};

export default function RewardMarketplaceScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rewards, setRewards] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');

  const fetchData = useCallback(async () => {
    try {
      const [rewardsRes, balanceRes, redemptionsRes] = await Promise.all([
        apiClient.get('/rewards').catch(() => ({ data: { data: [] } })),
        apiClient.get('/credits/balance').catch(() => ({ data: { data: { balance: 0 } } })),
        apiClient.get('/rewards/redemptions').catch(() => ({ data: { data: [] } })),
      ]);

      setRewards(rewardsRes.data?.data || []);
      setBalance(balanceRes.data?.data?.balance || 0);
      setRedemptions(redemptionsRes.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch rewards', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRedeem = async (reward: any) => {
    if (balance < reward.credits_required) {
      Alert.alert('Insufficient Credits', `You need ${reward.credits_required - balance} more credits to redeem this reward.`);
      return;
    }

    Alert.alert(
      'Redeem Reward',
      `Spend ${reward.credits_required} credits for "${reward.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setRedeeming(reward.id);
            try {
              await apiClient.post(`/rewards/${reward.id}/redeem`);
              setBalance(prev => prev - reward.credits_required);
              Alert.alert('Redeemed!', `You've successfully redeemed "${reward.name}". Check your redemption history for details.`);
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to redeem reward');
            } finally {
              setRedeeming(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#8B5CF6" />}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <View
        className="bg-purple-600 pt-14 pb-12 px-6"
        style={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-base">Reward Marketplace</Text>
          <View className="bg-white/20 px-3 py-1.5 rounded-xl">
            <Text className="text-white font-black text-xs">{balance.toLocaleString()} CC</Text>
          </View>
        </View>
        <Text className="text-white/70 font-medium text-sm text-center">Redeem your Civic Credits for real rewards</Text>
      </View>

      {/* Tab Selector */}
      <View className="flex-row mx-5 mt-5 bg-white rounded-2xl p-1.5" style={{ elevation: 3 }}>
        <TouchableOpacity
          onPress={() => setActiveTab('available')}
          className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'available' ? 'bg-purple-600' : ''}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'available' ? 'text-white' : 'text-gray-600'}`}>Available</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'history' ? 'bg-purple-600' : ''}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'history' ? 'text-white' : 'text-gray-600'}`}>My Rewards</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'available' ? (
        <View className="px-5 mt-5">
          {rewards.length === 0 ? (
            <View className="bg-white p-8 rounded-[22px] items-center" style={{ elevation: 3 }}>
              <Gift size={40} color="#CBD5E1" />
              <Text className="text-gray-400 font-bold text-base mt-4">No rewards available yet</Text>
              <Text className="text-gray-300 font-medium text-sm mt-1 text-center">Keep earning credits — new rewards coming soon!</Text>
            </View>
          ) : (
            rewards.map((reward: any) => {
              const categoryColor = CATEGORY_COLORS[reward.category] || CATEGORY_COLORS.partner;
              const Icon = CATEGORY_ICONS[reward.category] || Gift;
              const canAfford = balance >= reward.credits_required;

              return (
                <View
                  key={reward.id}
                  className="bg-white rounded-[22px] mb-4 overflow-hidden"
                  style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8 }}
                >
                  <View className="p-5">
                    <View className="flex-row items-start">
                      <View
                        className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                        style={{ backgroundColor: categoryColor.bg }}
                      >
                        <Icon size={22} color={categoryColor.text} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-black text-gray-900 text-base">{reward.name}</Text>
                        <Text className="text-gray-500 font-medium text-xs mt-1" numberOfLines={2}>{reward.description}</Text>
                        <View className="flex-row items-center mt-2">
                          <View className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: categoryColor.bg }}>
                            <Text className="text-[10px] font-bold capitalize" style={{ color: categoryColor.text }}>{reward.category}</Text>
                          </View>
                          {reward.monetary_value && (
                            <Text className="text-gray-400 text-xs font-bold ml-2">Worth ₹{reward.monetary_value}</Text>
                          )}
                          {reward.availability > 0 && (
                            <Text className="text-gray-300 text-xs font-medium ml-auto">{reward.availability - reward.claimed_count} left</Text>
                          )}
                        </View>
                      </View>
                    </View>

                    <View className="flex-row items-center mt-4 pt-4 border-t border-gray-50">
                      <View className="flex-row items-center flex-1">
                        <Leaf size={14} color="#16A34A" />
                        <Text className="font-black text-green-700 text-sm ml-1">{reward.credits_required}</Text>
                        <Text className="text-gray-400 text-xs font-medium ml-1">credits</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRedeem(reward)}
                        disabled={!canAfford || redeeming === reward.id}
                        className={`px-5 py-2.5 rounded-xl ${canAfford ? 'bg-purple-600' : 'bg-gray-200'}`}
                      >
                        {redeeming === reward.id ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <Text className={`font-bold text-sm ${canAfford ? 'text-white' : 'text-gray-400'}`}>
                            {canAfford ? 'Redeem' : 'Need more'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : (
        <View className="px-5 mt-5">
          {redemptions.length === 0 ? (
            <View className="bg-white p-8 rounded-[22px] items-center" style={{ elevation: 3 }}>
              <Award size={40} color="#CBD5E1" />
              <Text className="text-gray-400 font-bold text-base mt-4">No redemptions yet</Text>
              <Text className="text-gray-300 font-medium text-sm mt-1">Redeem your first reward to see it here</Text>
            </View>
          ) : (
            redemptions.map((redemption: any) => (
              <View
                key={redemption.id}
                className="bg-white p-5 rounded-[22px] mb-3 flex-row items-center"
                style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }}
              >
                <View className="w-10 h-10 rounded-2xl bg-purple-50 items-center justify-center">
                  <CheckCircle size={18} color="#8B5CF6" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-bold text-gray-800 text-sm">{redemption.reward_name || 'Reward'}</Text>
                  <Text className="text-gray-400 text-[10px] font-medium mt-0.5">
                    {new Date(redemption.created_at).toLocaleDateString()} • {redemption.credits_spent} credits
                  </Text>
                </View>
                <View className={`px-2.5 py-1 rounded-lg ${redemption.status === 'fulfilled' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <Text className={`text-[10px] font-bold capitalize ${redemption.status === 'fulfilled' ? 'text-green-700' : 'text-yellow-700'}`}>
                    {redemption.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}
