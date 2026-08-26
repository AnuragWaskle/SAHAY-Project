import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Target,
  Users,
  Trophy,
  Medal,
  ChevronRight,
  Plus,
  TrendingUp,
} from 'lucide-react-native';
import apiClient from '../api/client';

type Mission = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'completed' | 'proposed';
  target: number;
  current_progress: number;
  participant_count: number;
  is_participant: boolean;
};

type LeaderboardEntry = {
  name: string;
  civic_impact_score: number;
  level: number;
  badge_type: string;
  report_count: number;
};

type Tab = 'missions' | 'leaderboard';

export default function ActScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('missions');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      const response = await apiClient.get('/missions');
      setMissions(response.data.data);
    } catch {
      setMissions([]);
    } finally {
      setLoadingMissions(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await apiClient.get('/leaderboard?type=citizens');
      setLeaderboard(response.data.data);
    } catch {
      setLeaderboard([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
    fetchLeaderboard();
  }, [fetchMissions, fetchLeaderboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'missions') {
      await fetchMissions();
    } else {
      await fetchLeaderboard();
    }
    setRefreshing(false);
  };

  const handleJoinMission = async (id: string) => {
    setJoiningId(id);
    try {
      await apiClient.post(`/missions/${id}/join`);
      setMissions((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_participant: true, participant_count: m.participant_count + 1 } : m))
      );
    } finally {
      setJoiningId(null);
    }
  };

  const handleReportProgress = async (id: string) => {
    setReportingId(id);
    try {
      await apiClient.post(`/missions/${id}/progress`, { amount: 1 });
      setMissions((prev) =>
        prev.map((m) => (m.id === id ? { ...m, current_progress: m.current_progress + 1 } : m))
      );
    } finally {
      setReportingId(null);
    }
  };

  const getStatusColor = (status: Mission['status']) => {
    switch (status) {
      case 'active':
        return 'bg-brand-green';
      case 'completed':
        return 'bg-yellow-500';
      case 'proposed':
        return 'bg-gray-400';
    }
  };

  const getStatusBorderColor = (status: Mission['status']) => {
    switch (status) {
      case 'active':
        return 'border-brand-green';
      case 'completed':
        return 'border-yellow-500';
      case 'proposed':
        return 'border-gray-300';
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-100 border-yellow-400';
      case 1:
        return 'bg-gray-100 border-gray-400';
      case 2:
        return 'bg-orange-100 border-orange-400';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return '#DAA520';
      case 1:
        return '#808080';
      case 2:
        return '#CD7F32';
      default:
        return '#6B7280';
    }
  };

  const renderMissions = () => {
    if (loadingMissions) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#FF7E67" />
          <Text className="mt-3 text-gray-500 text-sm">Loading missions...</Text>
        </View>
      );
    }

    if (missions.length === 0) {
      return (
        <View className="flex-1 items-center justify-center py-20 px-6">
          <Target size={48} color="#9CA3AF" />
          <Text className="mt-4 text-gray-600 text-lg font-semibold">No Missions Yet</Text>
          <Text className="mt-2 text-gray-400 text-sm text-center">
            Check back soon for community missions you can join and make an impact.
          </Text>
        </View>
      );
    }

    return (
      <View className="px-4 pb-6">
        {missions.map((mission) => {
          const progress = mission.target > 0 ? (mission.current_progress / mission.target) * 100 : 0;
          const clampedProgress = Math.min(progress, 100);

          return (
            <View
              key={mission.id}
              className={`mb-4 rounded-2xl border-l-4 bg-white p-4 shadow-sm ${getStatusBorderColor(mission.status)}`}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center mb-1">
                    <View className={`px-2 py-0.5 rounded-full ${getStatusColor(mission.status)}`}>
                      <Text className="text-white text-xs font-medium capitalize">
                        {mission.status}
                      </Text>
                    </View>
                    <Text className="ml-2 text-xs text-gray-400 capitalize">{mission.category}</Text>
                  </View>
                  <Text className="text-base font-bold text-gray-800 mt-1">{mission.title}</Text>
                  <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                    {mission.description}
                  </Text>
                </View>
              </View>

              <View className="mt-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-500">Progress</Text>
                  <Text className="text-xs font-medium text-gray-700">
                    {mission.current_progress}/{mission.target}
                  </Text>
                </View>
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${getStatusColor(mission.status)}`}
                    style={{ width: `${clampedProgress}%` }}
                  />
                </View>
              </View>

              <View className="flex-row items-center justify-between mt-3">
                <View className="flex-row items-center">
                  <Users size={14} color="#6B7280" />
                  <Text className="ml-1 text-xs text-gray-500">
                    {mission.participant_count} participant{mission.participant_count !== 1 ? 's' : ''}
                  </Text>
                </View>

                {mission.status !== 'completed' && (
                  <View className="flex-row">
                    {!mission.is_participant ? (
                      <TouchableOpacity
                        onPress={() => handleJoinMission(mission.id)}
                        disabled={joiningId === mission.id}
                        className="flex-row items-center bg-brand-orange px-4 py-2 rounded-full"
                      >
                        {joiningId === mission.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Plus size={14} color="#FFFFFF" />
                            <Text className="ml-1 text-white text-xs font-semibold">Join Mission</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleReportProgress(mission.id)}
                        disabled={reportingId === mission.id}
                        className="flex-row items-center bg-brand-green px-4 py-2 rounded-full"
                      >
                        {reportingId === mission.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <TrendingUp size={14} color="#FFFFFF" />
                            <Text className="ml-1 text-white text-xs font-semibold">Report Progress</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderLeaderboard = () => {
    if (loadingLeaderboard) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#FF7E67" />
          <Text className="mt-3 text-gray-500 text-sm">Loading leaderboard...</Text>
        </View>
      );
    }

    if (leaderboard.length === 0) {
      return (
        <View className="flex-1 items-center justify-center py-20 px-6">
          <Trophy size={48} color="#9CA3AF" />
          <Text className="mt-4 text-gray-600 text-lg font-semibold">No Rankings Yet</Text>
          <Text className="mt-2 text-gray-400 text-sm text-center">
            Start participating in missions to climb the leaderboard.
          </Text>
        </View>
      );
    }

    return (
      <View className="px-4 pb-6">
        {leaderboard.map((entry, index) => (
          <View
            key={`${entry.name}-${index}`}
            className={`mb-3 flex-row items-center rounded-xl border p-4 ${getRankStyle(index)}`}
          >
            <View className="w-10 h-10 rounded-full items-center justify-center bg-white border border-gray-200">
              {index < 3 ? (
                <Medal size={20} color={getRankColor(index)} />
              ) : (
                <Text className="text-sm font-bold text-gray-500">{index + 1}</Text>
              )}
            </View>

            <View className="flex-1 ml-3">
              <Text className="text-base font-bold text-gray-800">{entry.name}</Text>
              <View className="flex-row items-center mt-0.5">
                <Text className="text-xs text-gray-500">Level {entry.level}</Text>
                <View className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
                <Text className="text-xs text-gray-500">{entry.report_count} reports</Text>
              </View>
            </View>

            <View className="items-end">
              <Text className="text-lg font-bold text-brand-orange">{entry.civic_impact_score}</Text>
              <Text className="text-xs text-gray-400">points</Text>
            </View>

            <ChevronRight size={16} color="#D1D5DB" className="ml-2" />
          </View>
        ))}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-14 pb-4 px-6 shadow-sm">
        <Text className="text-2xl font-bold text-gray-800">Act</Text>
        <Text className="text-sm text-gray-500 mt-1">Make an impact in your community</Text>
      </View>

      <View className="flex-row bg-white px-4 pb-3 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => setActiveTab('missions')}
          className={`flex-1 items-center py-3 rounded-xl mr-2 ${
            activeTab === 'missions' ? 'bg-brand-orange' : 'bg-gray-100'
          }`}
        >
          <View className="flex-row items-center">
            <Target size={16} color={activeTab === 'missions' ? '#FFFFFF' : '#6B7280'} />
            <Text
              className={`ml-2 font-semibold text-sm ${
                activeTab === 'missions' ? 'text-white' : 'text-gray-600'
              }`}
            >
              Missions
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('leaderboard')}
          className={`flex-1 items-center py-3 rounded-xl ml-2 ${
            activeTab === 'leaderboard' ? 'bg-brand-orange' : 'bg-gray-100'
          }`}
        >
          <View className="flex-row items-center">
            <Trophy size={16} color={activeTab === 'leaderboard' ? '#FFFFFF' : '#6B7280'} />
            <Text
              className={`ml-2 font-semibold text-sm ${
                activeTab === 'leaderboard' ? 'text-white' : 'text-gray-600'
              }`}
            >
              Leaderboard
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7E67']} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'missions' ? renderMissions() : renderLeaderboard()}
      </ScrollView>
    </View>
  );
}
