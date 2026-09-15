import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  StyleSheet
} from 'react-native';
import {
  Flame,
  MapPin,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Share2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  Users,
  Building2,
  Award,
  Layers,
  Search
} from 'lucide-react-native';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function FeedScreen({ navigation }: any) {
  const { role, user } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('nearby');
  const [beforeAfterToggle, setBeforeAfterToggle] = useState<Record<string, boolean>>({});

  const fetchFeed = async () => {
    try {
      const res = await apiClient.get('/incidents');
      if (Array.isArray(res.data)) {
        setIncidents(res.data);
      } else if (res.data?.incidents) {
        setIncidents(res.data.incidents);
      }
    } catch (e) {
      console.warn('Feed fetch fallback:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleVote = async (id: string, type: 'up' | 'down') => {
    try {
      // Optimistic update
      setIncidents((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const currentUp = item.upvotes_count || 0;
            const currentDown = item.downvotes_count || 0;
            return {
              ...item,
              upvotes_count: type === 'up' ? currentUp + 1 : currentUp,
              downvotes_count: type === 'down' ? currentDown + 1 : currentDown,
            };
          }
          return item;
        })
      );
      await apiClient.post(`/incidents/${id}/vote`, { type });
    } catch (e) {
      console.warn('Vote error:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>Sahay</Text>
            <View style={styles.logoDot} />
          </View>
          <TouchableOpacity style={styles.wardSelector}>
            <Text style={styles.wardText}>Ward 12, Bhopal</Text>
            <Text style={styles.wardArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
              }}
              style={styles.avatarImg}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeed(); }} />
        }
      >
        {/* Top Greeting & Live Pulse Bar */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.greetingTitle}>Good morning, {user?.name || 'Aryan'}</Text>
                <Text style={styles.handWave}>👋</Text>
              </View>
              <View style={styles.subLocRow}>
                <MapPin size={14} color="#0051D5" />
                <Text style={styles.subLocText}>Ward 12 • Bhopal</Text>
                <View style={styles.dotSeparator} />
                <Text style={styles.sentinelBadge}>Active Sentinel</Text>
              </View>
            </View>
          </View>

          {/* Category Pills Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            <TouchableOpacity
              style={[styles.pill, selectedFilter === 'nearby' && styles.pillActive]}
              onPress={() => setSelectedFilter('nearby')}
            >
              <MapPin size={14} color={selectedFilter === 'nearby' ? '#FFFFFF' : '#0B1C30'} />
              <Text style={[styles.pillText, selectedFilter === 'nearby' && styles.pillTextActive]}>Nearby</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, selectedFilter === 'trending' && styles.pillActive]}
              onPress={() => setSelectedFilter('trending')}
            >
              <Flame size={14} color={selectedFilter === 'trending' ? '#FFFFFF' : '#DA7500'} />
              <Text style={[styles.pillText, selectedFilter === 'trending' && styles.pillTextActive]}>Trending</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, selectedFilter === 'ward' && styles.pillActive]}
              onPress={() => setSelectedFilter('ward')}
            >
              <Building2 size={14} color={selectedFilter === 'ward' ? '#FFFFFF' : '#0051D5'} />
              <Text style={[styles.pillText, selectedFilter === 'ward' && styles.pillTextActive]}>My Ward</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, selectedFilter === 'following' && styles.pillActive]}
              onPress={() => setSelectedFilter('following')}
            >
              <Users size={14} color={selectedFilter === 'following' ? '#FFFFFF' : '#74777E'} />
              <Text style={[styles.pillText, selectedFilter === 'following' && styles.pillTextActive]}>Following</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Card 1: Ward Health Live Index */}
        <View style={styles.healthCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardTagText}>WARD HEALTH</Text>
              <View style={styles.livePulseTag}>
                <View style={styles.livePulseDot} />
                <Text style={styles.livePulseText}>Live Index</Text>
              </View>
            </View>
            <View style={styles.trendTag}>
              <TrendingUp size={14} color="#16A34A" />
              <Text style={styles.trendText}>↑ 6% this week</Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreTextCol}>
              <View style={styles.bigScoreRow}>
                <Text style={styles.bigScoreText}>78</Text>
                <Text style={styles.scoreMaxText}>/100</Text>
              </View>
              <Text style={styles.scoreSubText}>High Citizen Responsiveness</Text>
            </View>

            {/* Radial Badge Graphic */}
            <View style={styles.radialContainer}>
              <View style={styles.radialRingOuter}>
                <ShieldCheck size={28} color="#0051D5" />
              </View>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricVal}>12</Text>
              <Text style={styles.metricLbl}>Active Issues</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={[styles.metricVal, { color: '#16A34A' }]}>8</Text>
              <Text style={styles.metricLbl}>Resolved</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={[styles.metricVal, { color: '#0051D5' }]}>24</Text>
              <Text style={styles.metricLbl}>Citizens Active</Text>
            </View>
          </View>

          {/* Health Distribution */}
          <View style={styles.healthBarsContainer}>
            <View style={styles.healthLabelsRow}>
              <Text style={styles.barLabel}>Roads (82%)</Text>
              <Text style={styles.barLabel}>Sanitation (74%)</Text>
              <Text style={styles.barLabel}>Power (88%)</Text>
            </View>
            <View style={styles.multiProgressBar}>
              <View style={[styles.progressSegment, { width: '82%', backgroundColor: '#0051D5' }]} />
              <View style={[styles.progressSegment, { width: '74%', backgroundColor: '#DA7500' }]} />
              <View style={[styles.progressSegment, { width: '88%', backgroundColor: '#16A34A' }]} />
            </View>
          </View>
        </View>

        {/* Card 2: Civic Hotspots Near You */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Layers size={18} color="#0051D5" />
              <Text style={styles.sectionTitle}>Civic Hotspots Near You</Text>
            </View>
            <View style={styles.badgeSmall}>
              <Text style={styles.badgeSmallText}>5 Active</Text>
            </View>
          </View>

          {/* Map Preview Graphic */}
          <View style={styles.mapPreviewBox}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80',
              }}
              style={styles.mapImg}
            />
            {/* Map Markers Overlay */}
            <View style={[styles.mapMarker, { top: '30%', left: '25%', backgroundColor: '#BA1A1A' }]}>
              <Text style={styles.markerText}>Water Leak</Text>
            </View>
            <View style={[styles.mapMarker, { top: '45%', left: '60%', backgroundColor: '#DA7500' }]}>
              <Text style={styles.markerText}>Potholes</Text>
            </View>
            <View style={[styles.mapMarker, { top: '65%', left: '40%', backgroundColor: '#16A34A' }]}>
              <CheckCircle2 size={12} color="#FFF" />
            </View>

            <TouchableOpacity style={styles.exploreMapBtn}>
              <Text style={styles.exploreMapText}>Explore Map ↗</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#BA1A1A' }]} />
              <Text style={styles.legendText}>Critical</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#DA7500' }]} />
              <Text style={styles.legendText}>High</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0051D5' }]} />
              <Text style={styles.legendText}>In Progress</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.legendText}>Resolved</Text>
            </View>
          </View>
        </View>

        {/* Card 3: Quest Card */}
        <View style={styles.questCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Sparkles size={18} color="#16A34A" />
              <Text style={styles.questTitle}>Clean & Green Ward 12</Text>
            </View>
            <View style={styles.questBadge}>
              <Text style={styles.questBadgeText}>Limited Drive</Text>
            </View>
          </View>
          <Text style={styles.questDesc}>
            Community waste segregation & sapling plantation along Link Road stretch.
          </Text>

          <View style={styles.volunteerRow}>
            <View style={styles.avatarGroup}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }} style={styles.avatarSm} />
              <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }} style={[styles.avatarSm, { marginLeft: -8 }]} />
              <View style={[styles.avatarSmMore, { marginLeft: -8 }]}>
                <Text style={styles.avatarMoreText}>+24</Text>
              </View>
            </View>
            <Text style={styles.volunteerCountText}>26 volunteers joined</Text>
            <Text style={styles.targetMetText}>78% Target Met</Text>
          </View>

          <View style={styles.questFooterRow}>
            <View style={styles.rewardTag}>
              <Award size={14} color="#DA7500" />
              <Text style={styles.rewardTagText}>+500 XP • 50 Coins</Text>
            </View>
            <TouchableOpacity style={styles.joinQuestBtn}>
              <Zap size={14} color="#FFF" />
              <Text style={styles.joinQuestText}>JOIN QUEST ⚡</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feed Posts List */}
        <Text style={styles.sectionHeaderTitle}>Community Issue Feed</Text>

        {/* Post Item 1: Pothole with AI Detection Box */}
        <TouchableOpacity
          style={styles.postCard}
          onPress={() => navigation.navigate('IncidentDetail', { id: 'pothole-1' })}
        >
          <View style={styles.postAuthorRow}>
            <View style={styles.authorLeft}>
              <View style={styles.authorAvatarCircle}>
                <Text style={styles.avatarInitials}>SM</Text>
              </View>
              <View>
                <View style={styles.authorNameRow}>
                  <Text style={styles.authorName}>Sunita M.</Text>
                  <ShieldCheck size={14} color="#0051D5" />
                </View>
                <Text style={styles.postTimeText}>Reported 2h ago</Text>
              </View>
            </View>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>Priority: 9.1 / 10</Text>
            </View>
          </View>

          <Text style={styles.postTitle}>Large pothole reported</Text>
          <View style={styles.locationTagRow}>
            <MapPin size={13} color="#BA1A1A" />
            <Text style={styles.locationTagText}>Main Road, Ward 12 (Opp. SBI ATM)</Text>
          </View>

          {/* Hero Image with AI Bounding Box Overlay */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
              }}
              style={styles.postImage}
            />

            {/* AI Bounding Box Overlay */}
            <View style={styles.aiBoundingBox}>
              <View style={styles.aiTagTop}>
                <Sparkles size={12} color="#FFF" />
                <Text style={styles.aiTagTopText}>Sahay AI: Pothole (98% match)</Text>
              </View>
              <View style={styles.aiAreaTag}>
                <Text style={styles.aiAreaText}>Area: 1.4m²</Text>
              </View>
            </View>
          </View>

          <View style={styles.postStatusRow}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: '#DA7500' }]} />
              <Text style={styles.statusText}>In Progress</Text>
            </View>
            <Text style={styles.assignedText}>Assigned to Ward Engineer</Text>
          </View>

          {/* Action Row: Support, Track Status, Share */}
          <View style={styles.postActionsRow}>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => handleVote('pothole-1', 'up')}
            >
              <ArrowUp size={16} color="#0051D5" />
              <Text style={styles.actionBtnPrimaryText}>Support (24)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnSecondary}>
              <Text style={styles.actionBtnSecondaryText}>Track Status</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconActionBtn}>
              <Share2 size={16} color="#74777E" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Post Item 2: Streetlight Resolved with Before / After Slide */}
        <TouchableOpacity style={styles.postCard}>
          <View style={styles.postAuthorRow}>
            <View style={styles.authorLeft}>
              <View style={[styles.authorAvatarCircle, { backgroundColor: '#E6F4EA' }]}>
                <CheckCircle2 size={20} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.postTitleInline}>Streetlight #184 Resolved</Text>
                <Text style={styles.postTimeText}>Sector 4, Near Community Park</Text>
              </View>
            </View>
            <View style={styles.xpRewardPill}>
              <Text style={styles.xpRewardText}>+10 XP</Text>
            </View>
          </View>

          {/* Before / After Dual Image Container */}
          <View style={styles.beforeAfterContainer}>
            <View style={styles.beforeHalf}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80',
                }}
                style={styles.halfImage}
              />
              <View style={styles.halfTagDark}>
                <Text style={styles.halfTagText}>Before: Broken</Text>
              </View>
            </View>

            <View style={styles.afterHalf}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=400&q=80',
                }}
                style={styles.halfImage}
              />
              <View style={styles.halfTagGreen}>
                <Text style={styles.halfTagText}>After: Fixed LED</Text>
              </View>
            </View>

            <View style={styles.compareHandle}>
              <ChevronRight size={14} color="#0B1C30" />
            </View>
          </View>

          <View style={styles.verifiedInfoRow}>
            <CheckCircle2 size={14} color="#16A34A" />
            <Text style={styles.verifiedCitizensText}>Verified by 18 citizens</Text>
            <View style={styles.aiVerifiedPill}>
              <Sparkles size={11} color="#0051D5" />
              <Text style={styles.aiVerifiedText}>Sahay AI Verified (94% match)</Text>
            </View>
          </View>

          {/* Bottom reaction count */}
          <View style={styles.reactionRow}>
            <View style={styles.reactionGroup}>
              <TouchableOpacity style={styles.reactionBtn}>
                <Text style={styles.reactionEmoji}>🙌</Text>
                <Text style={styles.reactionVal}>42</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reactionBtn}>
                <Text style={styles.reactionEmoji}>❤️</Text>
                <Text style={styles.reactionVal}>19</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.rankBoostText}>Ward 12 rank +2 positions</Text>
          </View>
        </TouchableOpacity>

        {/* Dynamic Incidents fetched from Backend API */}
        {incidents.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.postCard}
            onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}
          >
            <View style={styles.postAuthorRow}>
              <View style={styles.authorLeft}>
                <View style={styles.authorAvatarCircle}>
                  <Text style={styles.avatarInitials}>
                    {item.reporter?.name ? item.reporter.name.substring(0, 2).toUpperCase() : 'CI'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.authorName}>{item.reporter?.name || 'Citizen Sentinel'}</Text>
                  <Text style={styles.postTimeText}>{item.category || 'General Issue'}</Text>
                </View>
              </View>
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>Priority: {item.priority_score || '7.5'}</Text>
              </View>
            </View>

            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postDescSnippet} numberOfLines={2}>
              {item.description}
            </Text>

            {item.media_urls && item.media_urls[0] && (
              <Image source={{ uri: item.media_urls[0] }} style={styles.postImage} />
            )}

            <View style={styles.postActionsRow}>
              <TouchableOpacity
                style={styles.voteBtn}
                onPress={() => handleVote(item.id, 'up')}
              >
                <ArrowUp size={16} color="#0051D5" />
                <Text style={styles.voteText}>{item.upvotes_count || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.voteBtn}
                onPress={() => handleVote(item.id, 'down')}
              >
                <ArrowDown size={16} color="#BA1A1A" />
                <Text style={styles.voteText}>{item.downvotes_count || 0}</Text>
              </TouchableOpacity>

              <View style={styles.commentBtn}>
                <MessageSquare size={16} color="#74777E" />
                <Text style={styles.commentText}>{item.comments_count || 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
    height: 64,
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EEFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00152A',
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0051D5',
  },
  wardSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  wardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0051D5',
  },
  wardArrow: {
    fontSize: 10,
    color: '#0051D5',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 18,
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#BA1A1A',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  greetingSection: {
    marginBottom: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00152A',
  },
  handWave: {
    fontSize: 20,
  },
  subLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  subLocText: {
    fontSize: 12,
    color: '#43474D',
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C3C6CE',
  },
  sentinelBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0051D5',
  },
  pillScroll: {
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5EEFF',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#00152A',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B1C30',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#102A43',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0051D5',
    letterSpacing: 0.5,
  },
  livePulseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF4FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  livePulseText: {
    fontSize: 10,
    color: '#43474D',
    fontWeight: '600',
  },
  trendTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTextCol: {
    flex: 1,
  },
  bigScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigScoreText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#00152A',
  },
  scoreMaxText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#74777E',
  },
  scoreSubText: {
    fontSize: 12,
    color: '#43474D',
    marginTop: 2,
  },
  radialContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialRingOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: '#0051D5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5EEFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#EFF4FF',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    justifyContent: 'space-around',
  },
  metricCell: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00152A',
  },
  metricLbl: {
    fontSize: 11,
    color: '#43474D',
    marginTop: 2,
  },
  healthBarsContainer: {
    marginTop: 12,
  },
  healthLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#74777E',
  },
  multiProgressBar: {
    height: 6,
    backgroundColor: '#E5EEFF',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#102A43',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00152A',
  },
  badgeSmall: {
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0051D5',
  },
  mapPreviewBox: {
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    position: 'relative',
  },
  mapImg: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  markerText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  exploreMapBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#0051D5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exploreMapText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#43474D',
  },
  questCard: {
    backgroundColor: '#EFF4FF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D3E4FE',
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00152A',
  },
  questBadge: {
    backgroundColor: '#FFDCC4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  questBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6F3900',
  },
  questDesc: {
    fontSize: 12,
    color: '#43474D',
    marginTop: 4,
  },
  volunteerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  avatarGroup: {
    flexDirection: 'row',
  },
  avatarSm: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  avatarSmMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00152A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  avatarMoreText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  volunteerCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0B1C30',
  },
  targetMetText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0051D5',
    marginLeft: 'auto',
  },
  questFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  rewardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  rewardTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DA7500',
  },
  joinQuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DA7500',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinQuestText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00152A',
    marginBottom: 12,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#102A43',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0051D5',
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1C30',
  },
  postTimeText: {
    fontSize: 11,
    color: '#74777E',
  },
  priorityBadge: {
    backgroundColor: '#FFDAD6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BA1A1A',
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00152A',
    marginBottom: 4,
  },
  postTitleInline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00152A',
  },
  locationTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  locationTagText: {
    fontSize: 12,
    color: '#74777E',
  },
  imageContainer: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  aiBoundingBox: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    bottom: 24,
    borderWidth: 2,
    borderColor: '#316BF3',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: 'rgba(49, 107, 243, 0.1)',
    justifyContent: 'space-between',
    padding: 6,
  },
  aiTagTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#316BF3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  aiTagTopText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  aiAreaTag: {
    backgroundColor: '#00152A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  aiAreaText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  postStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B1C30',
  },
  assignedText: {
    fontSize: 11,
    color: '#74777E',
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0051D5',
  },
  actionBtnSecondary: {
    backgroundColor: '#EFF4FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00152A',
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  xpRewardPill: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  xpRewardText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  beforeAfterContainer: {
    flexDirection: 'row',
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
    gap: 4,
  },
  beforeHalf: {
    flex: 1,
    position: 'relative',
  },
  afterHalf: {
    flex: 1,
    position: 'relative',
  },
  halfImage: {
    width: '100%',
    height: '100%',
  },
  halfTagDark: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  halfTagGreen: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  halfTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  compareHandle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  verifiedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  verifiedCitizensText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  aiVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  aiVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0051D5',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reactionGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B1C30',
  },
  rankBoostText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#74777E',
  },
  postDescSnippet: {
    fontSize: 13,
    color: '#43474D',
    marginBottom: 8,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  voteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B1C30',
  },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 'auto',
  },
  commentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B1C30',
  },
});
