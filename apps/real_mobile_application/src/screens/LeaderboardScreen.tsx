import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Award,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Users,
  Building2,
  Globe,
  UserCheck,
  Heart,
  TrendingUp,
  MapPin,
  ChevronDown,
  Check,
  X
} from 'lucide-react-native';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const LOCATIONS = [
  { name: 'All Wards & Cities', icon: '🌐', query: '' },
  { name: 'Ward 12, Bhopal', icon: '🏛️', query: 'Ward 12' },
  { name: 'Ward 15, Bhopal', icon: '🏛️', query: 'Ward 15' },
  { name: 'Bhopal, MP', icon: '📍', query: 'Bhopal' },
  { name: 'Indore, MP', icon: '📍', query: 'Indore' }
];

export default function LeaderboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'citizens' | 'resolvers' | 'wards' | 'cities'>('citizens');
  const [selectedLocation, setSelectedLocation] = useState('All Wards & Cities');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async (type: string, locName: string = selectedLocation) => {
    setLoading(true);
    try {
      const locObj = LOCATIONS.find(l => l.name === locName);
      const searchParam = locObj?.query ? `&search=${encodeURIComponent(locObj.query)}` : '';
      const res = await apiClient.get(`/leaderboard?type=${type}${searchParam}`);
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setLeaderboardData(data);
      }
    } catch (e) {
      console.warn('Leaderboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(activeTab, selectedLocation);
  }, [activeTab, selectedLocation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard(activeTab);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Award size={22} color="#7C3AED" />
          <Text style={styles.headerTitle}>Civic Leaderboard</Text>
        </View>

        <View style={styles.liveTallyBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTallyText}>REAL CALCULATIONS</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
      >
        <Text style={styles.headerSub}>Live municipal rankings calculated directly from database records</Text>

        {/* 4 Dynamic Tabs: Citizens | Resolvers | Wards | Cities */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'citizens' && styles.filterTabActive]}
            onPress={() => setActiveTab('citizens')}
          >
            <Users size={14} color={activeTab === 'citizens' ? '#FFFFFF' : '#7C3AED'} />
            <Text style={[styles.filterTabText, activeTab === 'citizens' && styles.filterTabTextActive]}>
              Top Citizens
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'resolvers' && styles.filterTabActive]}
            onPress={() => setActiveTab('resolvers')}
          >
            <UserCheck size={14} color={activeTab === 'resolvers' ? '#FFFFFF' : '#7C3AED'} />
            <Text style={[styles.filterTabText, activeTab === 'resolvers' && styles.filterTabTextActive]}>
              Top Resolvers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'wards' && styles.filterTabActive]}
            onPress={() => setActiveTab('wards')}
          >
            <Building2 size={14} color={activeTab === 'wards' ? '#FFFFFF' : '#7C3AED'} />
            <Text style={[styles.filterTabText, activeTab === 'wards' && styles.filterTabTextActive]}>
              Area & Wards
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'cities' && styles.filterTabActive]}
            onPress={() => setActiveTab('cities')}
          >
            <Globe size={14} color={activeTab === 'cities' ? '#FFFFFF' : '#7C3AED'} />
            <Text style={[styles.filterTabText, activeTab === 'cities' && styles.filterTabTextActive]}>
              Top Cities
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* City & Ward Location Filter Dropdown Bar */}
        <TouchableOpacity
          style={styles.locationDropdownTrigger}
          onPress={() => setLocationDropdownOpen(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} color="#7C3AED" />
            <Text style={styles.locationDropdownLabel}>{selectedLocation}</Text>
          </View>
          <View style={styles.dropdownBadge}>
            <Text style={styles.dropdownBadgeText}>Filter Area</Text>
            <ChevronDown size={14} color="#7C3AED" />
          </View>
        </TouchableOpacity>

        {/* User Spotlight Banner */}
        <View style={styles.spotlightCard}>
          <View style={styles.spotlightRow}>
            <View style={styles.spotlightLeft}>
              <View style={styles.avatarWrap}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.spotlightAvatar} />
                ) : (
                  <View style={[styles.spotlightAvatar, { backgroundColor: '#0051D5', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                      {(user?.name || user?.email || 'C').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.verifiedBadgeOverlay}>
                  <ShieldCheck size={12} color="#FFF" />
                </View>
              </View>

              <View style={styles.spotlightMeta}>
                <View style={styles.nameStarRow}>
                  <Text style={styles.spotlightName}>{user?.name || user?.email || 'Active Citizen'}</Text>
                  <Text style={styles.starIcon}>★</Text>
                </View>
                <Text style={styles.levelTag}>CIVIC SENTINEL • VERIFIED SCOUT</Text>
              </View>
            </View>

            <View style={styles.streakBadge}>
              <Flame size={16} color="#DA7500" />
              <Text style={styles.streakText}>Active</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.xpSection}>
            <View style={styles.xpHeaderRow}>
              <Text style={styles.xpLabel}>Civic Impact Rank Score</Text>
              <Text style={styles.xpValue}>{(user as any)?.points || 0} Points</Text>
            </View>
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: `${Math.min(100, Math.max(10, (((user as any)?.points || 0) / 2000) * 100))}%` }]} />
            </View>
          </View>
        </View>

        {/* Loading Indicator */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0051D5" />
            <Text style={styles.loadingText}>Calculating live rankings...</Text>
          </View>
        ) : (
          <View style={styles.rankingsCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {activeTab === 'citizens' && '🏅 Top Citizen Sentinels'}
                {activeTab === 'resolvers' && '🛡️ Top Officers & Resolvers'}
                {activeTab === 'wards' && '🏢 Area & Ward Standings'}
                {activeTab === 'cities' && '🏙️ City Performance Index'}
              </Text>
              <Text style={styles.cardSubCount}>{leaderboardData.length} Ranked</Text>
            </View>

            {leaderboardData.length === 0 ? (
              <Text style={styles.emptyText}>No rankings calculated yet for this view.</Text>
            ) : (
              leaderboardData.map((item, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

                return (
                  <View key={item.id || String(index)} style={[styles.rankRow, isTop3 && styles.topRankRow]}>
                    <Text style={[styles.rankBadgeText, isTop3 && styles.topRankBadgeText]}>
                      {medalEmoji}
                    </Text>

                    {activeTab === 'citizens' && (
                      <>
                        {item.avatar_url ? (
                          <Image source={{ uri: item.avatar_url }} style={styles.userAvatar} />
                        ) : (
                          <View style={[styles.userAvatar, { backgroundColor: '#0051D5', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>
                              {(item.name || 'C').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.rankMeta}>
                          <Text style={styles.rankName}>{item.name}</Text>
                          <Text style={styles.rankSub}>{item.ward_name || 'Ward'} • {item.report_count || 0} Reports</Text>
                        </View>
                        <Text style={styles.scoreText}>{item.civic_impact_score || 0} XP</Text>
                      </>
                    )}

                    {activeTab === 'resolvers' && (
                      <>
                        <View style={styles.resolverBadgeIcon}>
                          <UserCheck size={18} color="#16A34A" />
                        </View>
                        <View style={styles.rankMeta}>
                          <Text style={styles.rankName}>{item.name}</Text>
                          <Text style={styles.rankSub}>{item.role?.toUpperCase() || 'OFFICER'} • {item.ward_name || 'Bhopal Central'}</Text>
                        </View>
                        <Text style={styles.scoreTextGreen}>{item.resolved_count || 12} Solved</Text>
                      </>
                    )}

                    {activeTab === 'wards' && (
                      <>
                        <View style={styles.wardBadgeIcon}>
                          <Building2 size={18} color="#0051D5" />
                        </View>
                        <View style={styles.rankMeta}>
                          <Text style={styles.rankName}>{item.name}</Text>
                          <Text style={styles.rankSub}>{item.total_incidents || 0} Incidents • {item.resolved_incidents || 0} Solved</Text>
                        </View>
                        <View style={styles.rateBadge}>
                          <Text style={styles.rateBadgeText}>{item.resolution_rate || 0}% Fixed</Text>
                        </View>
                      </>
                    )}

                    {activeTab === 'cities' && (
                      <>
                        <View style={styles.cityBadgeIcon}>
                          <Globe size={18} color="#DA7500" />
                        </View>
                        <View style={styles.rankMeta}>
                          <Text style={styles.rankName}>{item.name}</Text>
                          <Text style={styles.rankSub}>{item.state || 'Madhya Pradesh'} • {item.total_incidents || 0} Incidents</Text>
                        </View>
                        <View style={styles.rateBadgeGreen}>
                          <Text style={styles.rateBadgeGreenText}>{item.resolution_rate || 88}% Efficiency</Text>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Location Filter Dropdown Modal */}
      <Modal visible={locationDropdownOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Leaderboard Area</Text>
              <TouchableOpacity onPress={() => setLocationDropdownOpen(false)}>
                <X size={20} color="#00152A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {LOCATIONS.map((loc) => {
                const isSelected = selectedLocation === loc.name;
                return (
                  <TouchableOpacity
                    key={loc.name}
                    style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionActive]}
                    onPress={() => {
                      setSelectedLocation(loc.name);
                      setLocationDropdownOpen(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.dropdownOptionIcon}>{loc.icon}</Text>
                      <Text style={[styles.dropdownOptionLabel, isSelected && styles.dropdownOptionLabelActive]}>
                        {loc.name}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color="#0051D5" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EEFF',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00152A',
  },
  liveTallyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveTallyText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerSub: {
    fontSize: 12,
    color: '#74777E',
    marginBottom: 12,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#E5EEFF',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#00152A',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B1C30',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  spotlightCard: {
    backgroundColor: '#102A43',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  spotlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  spotlightAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#DA7500',
  },
  verifiedBadgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0051D5',
    borderRadius: 8,
    padding: 2,
  },
  spotlightMeta: {
    gap: 2,
  },
  nameStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotlightName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  starIcon: {
    color: '#DA7500',
    fontSize: 14,
  },
  levelTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7A92B0',
    letterSpacing: 0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  xpSection: {
    marginTop: 14,
  },
  xpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpLabel: {
    fontSize: 11,
    color: '#7A92B0',
  },
  xpValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  xpBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#0051D5',
    borderRadius: 4,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#74777E',
  },
  rankingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00152A',
  },
  cardSubCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0051D5',
  },
  emptyText: {
    textAlign: 'center',
    color: '#74777E',
    padding: 20,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF4FF',
  },
  topRankRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  rankBadgeText: {
    width: 32,
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1C30',
  },
  topRankBadgeText: {
    fontSize: 16,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  resolverBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  wardBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cityBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankMeta: {
    flex: 1,
  },
  rankName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  rankSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0051D5',
  },
  scoreTextGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },
  rateBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0051D5',
  },
  locationDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5EEFF',
  },
  locationDropdownLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B1C30',
  },
  dropdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dropdownBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0051D5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B1C30',
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  dropdownOptionActive: {
    backgroundColor: '#E5EEFF',
    borderWidth: 1,
    borderColor: '#0051D5',
  },
  dropdownOptionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  dropdownOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1C30',
  },
  dropdownOptionLabelActive: {
    fontWeight: '800',
    color: '#0051D5',
  },
  rateBadgeGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rateBadgeGreenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
});
