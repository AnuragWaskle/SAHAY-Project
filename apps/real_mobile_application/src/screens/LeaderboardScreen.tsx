import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import {
  Award,
  Flame,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Zap,
  Users,
  Lock,
  Heart
} from 'lucide-react-native';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LeaderboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'ward'>('week');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await apiClient.get('/leaderboard');
        if (Array.isArray(res.data)) {
          setLeaderboardData(res.data);
        }
      } catch (e) {
        console.warn('Leaderboard fetch fallback:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Award size={22} color="#0051D5" />
          <Text style={styles.headerTitle}>Civic Champions</Text>
        </View>

        <View style={styles.liveTallyBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTallyText}>LIVE TALLY</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerSub}>Recognizing Ward 12’s most active change-makers</Text>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'week' && styles.filterTabActive]}
            onPress={() => setActiveTab('week')}
          >
            <Text style={[styles.filterTabText, activeTab === 'week' && styles.filterTabTextActive]}>
              This Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'month' && styles.filterTabActive]}
            onPress={() => setActiveTab('month')}
          >
            <Text style={[styles.filterTabText, activeTab === 'month' && styles.filterTabTextActive]}>
              This Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'ward' && styles.filterTabActive]}
            onPress={() => setActiveTab('ward')}
          >
            <Text style={[styles.filterTabText, activeTab === 'ward' && styles.filterTabTextActive]}>
              My Ward
            </Text>
          </TouchableOpacity>
        </View>

        {/* User Spotlight Banner */}
        <View style={styles.spotlightCard}>
          <View style={styles.spotlightRow}>
            <View style={styles.spotlightLeft}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                  }}
                  style={styles.spotlightAvatar}
                />
                <View style={styles.verifiedBadgeOverlay}>
                  <ShieldCheck size={12} color="#FFF" />
                </View>
              </View>

              <View style={styles.spotlightMeta}>
                <View style={styles.nameStarRow}>
                  <Text style={styles.spotlightName}>{user?.name || 'Aryan'}</Text>
                  <Text style={styles.starIcon}>★</Text>
                </View>
                <Text style={styles.levelTag}>CIVIC RANGER • LEVEL 07</Text>
              </View>
            </View>

            <View style={styles.streakBadge}>
              <Flame size={16} color="#DA7500" />
              <Text style={styles.streakText}>9 Days</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.xpSection}>
            <View style={styles.xpHeaderRow}>
              <Text style={styles.xpLabel}>XP Progress</Text>
              <Text style={styles.xpValue}>1,840 / 2,000 XP</Text>
            </View>
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: '92%' }]} />
            </View>
          </View>

          <View style={styles.spotlightFooter}>
            <View style={styles.boltInfo}>
              <Zap size={14} color="#DA7500" />
              <Text style={styles.boltText}>160 XP to Level 08 (Civic Guardian)</Text>
            </View>
            <TouchableOpacity style={styles.perksBtn}>
              <Text style={styles.perksText}>Perks →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3D Podium Leaders */}
        <View style={styles.podiumCard}>
          <View style={styles.podiumHeader}>
            <Text style={styles.podiumTitle}>Podium Leaders</Text>
            <View style={styles.weekPill}>
              <Text style={styles.weekPillText}>Week 18</Text>
            </View>
          </View>

          <View style={styles.podiumGrid}>
            {/* 2nd Place */}
            <View style={styles.podiumColumn}>
              <View style={styles.podiumAvatarWrap}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
                  }}
                  style={styles.podiumAvatar}
                />
                <View style={[styles.rankPill, { backgroundColor: '#C3C6CE' }]}>
                  <Text style={styles.rankPillText}>🥈 2</Text>
                </View>
              </View>
              <Text style={styles.podiumName}>Riya S.</Text>
              <Text style={styles.podiumXP}>1,620 XP</Text>
              <Text style={styles.podiumSub}>Green Warrior</Text>
              <View style={[styles.podiumBlock, { height: 70, backgroundColor: '#E5EEFF' }]} />
            </View>

            {/* 1st Place (Center & Tallest) */}
            <View style={styles.podiumColumn}>
              <Text style={styles.crownIcon}>👑</Text>
              <View style={styles.podiumAvatarWrap}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                  }}
                  style={[styles.podiumAvatar, { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#DA7500' }]}
                />
                <View style={[styles.rankPill, { backgroundColor: '#DA7500' }]}>
                  <Text style={styles.rankPillText}>🥇 1</Text>
                </View>
              </View>
              <Text style={[styles.podiumName, { fontWeight: '800' }]}>Aryan</Text>
              <Text style={[styles.podiumXP, { color: '#0051D5', fontWeight: '800' }]}>1,840 XP</Text>
              <Text style={styles.podiumSub}>+12 Resolved</Text>
              <View style={[styles.podiumBlock, { height: 95, backgroundColor: '#D3E4FE' }]}>
                <Text style={styles.wardOneText}>WARD #1</Text>
              </View>
            </View>

            {/* 3rd Place */}
            <View style={styles.podiumColumn}>
              <View style={styles.podiumAvatarWrap}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                  }}
                  style={styles.podiumAvatar}
                />
                <View style={[styles.rankPill, { backgroundColor: '#FFDCC4' }]}>
                  <Text style={styles.rankPillText}>🥉 3</Text>
                </View>
              </View>
              <Text style={styles.podiumName}>Aditya V.</Text>
              <Text style={styles.podiumXP}>1,480 XP</Text>
              <Text style={styles.podiumSub}>Road Inspector</Text>
              <View style={[styles.podiumBlock, { height: 55, backgroundColor: '#EFF4FF' }]} />
            </View>
          </View>
        </View>

        {/* Ward Standings Table */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Ward Standings</Text>
          <Text style={styles.sectionSub}>Top Active Scouts</Text>
        </View>

        <View style={styles.standingsList}>
          {[
            { rank: 4, name: 'Priya Nair', xp: '1,320 XP', issues: '8 Issues Verified', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100' },
            { rank: 5, name: 'Rajesh Kumar', xp: '1,190 XP', issues: '6 Issues Verified', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
            { rank: 6, name: 'Ananya Sen', xp: '980 XP', issues: '5 Issues Verified', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
            { rank: 7, name: 'Vikram Rathore', xp: '890 XP', issues: '4 Issues Verified', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
          ].map((item) => (
            <View key={item.rank} style={styles.standingRow}>
              <Text style={styles.rankNum}>{item.rank}</Text>
              <Image source={{ uri: item.avatar }} style={styles.rowAvatar} />
              <View style={styles.rowMeta}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub}>{item.issues}</Text>
              </View>
              <Text style={styles.rowXP}>{item.xp}</Text>
              <TouchableOpacity style={styles.likeBtn}>
                <Heart size={16} color="#74777E" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Civic Badges Grid */}
        <View style={styles.badgesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🏆 Civic Badges</Text>
            <View style={styles.badgeCountTag}>
              <Text style={styles.badgeCountText}>6 of 12 Unlocked</Text>
            </View>
          </View>

          <View style={styles.badgesGrid}>
            <View style={styles.badgeCard}>
              <View style={styles.badgeIconBox}>
                <ShieldCheck size={20} color="#0051D5" />
              </View>
              <Text style={styles.badgeName}>Road Guard</Text>
              <Text style={styles.badgeLevel}>Lvl 3 • Done</Text>
            </View>

            <View style={styles.badgeCard}>
              <View style={styles.badgeIconBox}>
                <Award size={20} color="#16A34A" />
              </View>
              <Text style={styles.badgeName}>Green Warrior</Text>
              <Text style={styles.badgeLevel}>Lvl 2 • Done</Text>
            </View>

            <View style={styles.badgeCard}>
              <View style={styles.badgeIconBox}>
                <Zap size={20} color="#DA7500" />
              </View>
              <Text style={styles.badgeName}>Light Saver</Text>
              <Text style={styles.badgeLevel}>Lvl 1 • Done</Text>
            </View>

            <View style={styles.badgeCard}>
              <View style={styles.badgeIconBox}>
                <CheckCircle2 size={20} color="#0051D5" />
              </View>
              <Text style={styles.badgeName}>Clean City</Text>
              <Text style={styles.badgeLevel}>Master • Done</Text>
            </View>

            <View style={[styles.badgeCard, styles.badgeLocked]}>
              <View style={styles.badgeIconBoxLocked}>
                <Lock size={18} color="#74777E" />
              </View>
              <Text style={styles.badgeNameLocked}>Water Sentinel</Text>
              <Text style={styles.badgeLevelLocked}>2 reports left</Text>
            </View>

            <View style={[styles.badgeCard, styles.badgeLocked]}>
              <View style={styles.badgeIconBoxLocked}>
                <Lock size={18} color="#74777E" />
              </View>
              <Text style={styles.badgeNameLocked}>Rapid Resp.</Text>
              <Text style={styles.badgeLevelLocked}>Locked</Text>
            </View>
          </View>
        </View>

        {/* Your Civic Circle Banner */}
        <View style={styles.circleCard}>
          <View style={styles.circleHeaderRow}>
            <View style={styles.circleHeaderLeft}>
              <Users size={18} color="#0051D5" />
              <Text style={styles.circleTitle}>Your Civic Circle</Text>
            </View>
            <View style={styles.circleRankTag}>
              <Text style={styles.circleRankText}>Rank #3 East</Text>
            </View>
          </View>

          <View style={styles.circleContentRow}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=200',
              }}
              style={styles.circleImg}
            />
            <View style={styles.circleMeta}>
              <Text style={styles.circleName}>Ward 12 Clean Brigade</Text>
              <Text style={styles.circleMembers}>26 Active Ward Citizens</Text>
              <Text style={styles.circleUpdate}>• Completed Sector C drainage cleanup!</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.viewCircleBtn}>
            <Text style={styles.viewCircleText}>View Circle (26 Members) →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    height: 60,
    backgroundColor: '#F8F9FF',
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
    backgroundColor: '#0051D5',
  },
  liveTallyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0051D5',
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
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#E5EEFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#43474D',
  },
  filterTabTextActive: {
    color: '#00152A',
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
    fontSize: 18,
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
  spotlightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
  },
  boltInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  boltText: {
    fontSize: 11,
    color: '#7A92B0',
  },
  perksBtn: {},
  perksText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DBE1FF',
  },
  podiumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  podiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  podiumTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00152A',
  },
  weekPill: {
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  weekPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0051D5',
  },
  podiumGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 10,
  },
  podiumColumn: {
    alignItems: 'center',
    width: '30%',
  },
  crownIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  podiumAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  rankPill: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  rankPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B1C30',
    marginTop: 4,
  },
  podiumXP: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0051D5',
  },
  podiumSub: {
    fontSize: 9,
    color: '#74777E',
    marginBottom: 6,
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardOneText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0051D5',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00152A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#74777E',
  },
  standingsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    marginBottom: 16,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF4FF',
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00152A',
    width: 24,
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  rowMeta: {
    flex: 1,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B1C30',
  },
  rowSub: {
    fontSize: 10,
    color: '#74777E',
  },
  rowXP: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0051D5',
    marginRight: 10,
  },
  likeBtn: {
    padding: 6,
  },
  badgesSection: {
    marginBottom: 16,
  },
  badgeCountTag: {
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0051D5',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  badgeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B1C30',
    textAlign: 'center',
  },
  badgeLevel: {
    fontSize: 9,
    color: '#0051D5',
    marginTop: 2,
  },
  badgeLocked: {
    backgroundColor: '#EFF4FF',
    opacity: 0.7,
  },
  badgeIconBoxLocked: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  badgeNameLocked: {
    fontSize: 11,
    fontWeight: '600',
    color: '#74777E',
    textAlign: 'center',
  },
  badgeLevelLocked: {
    fontSize: 9,
    color: '#74777E',
    marginTop: 2,
  },
  circleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  circleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  circleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  circleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00152A',
  },
  circleRankTag: {
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  circleRankText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0051D5',
  },
  circleContentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  circleImg: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  circleMeta: {
    flex: 1,
  },
  circleName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B1C30',
  },
  circleMembers: {
    fontSize: 11,
    color: '#74777E',
  },
  circleUpdate: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  viewCircleBtn: {
    backgroundColor: '#0051D5',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  viewCircleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
