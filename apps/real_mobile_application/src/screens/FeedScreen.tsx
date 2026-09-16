import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Share,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Flame,
  MapPin,
  CheckCircle2,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Share2,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Filter,
  Camera,
  Zap,
  Droplets,
  ShieldAlert,
  AlertTriangle,
  Bell,
  User,
  ExternalLink
} from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import UserProfileModal from '../components/UserProfileModal';

const FEED_CATEGORIES = [
  { name: 'All Categories', key: 'all', icon: '🌐' },
  { name: 'Roads & Potholes', key: 'road_damage', icon: '🛣️' },
  { name: 'Power & Lights', key: 'streetlight', icon: '⚡' },
  { name: 'Water & Drainage', key: 'waterlogging', icon: '🚰' },
  { name: 'Sanitation & Garbage', key: 'garbage', icon: '🧹' },
  { name: 'Safety & Hazards', key: 'safety', icon: '🛡️' },
  { name: 'Environment & Trees', key: 'tree_hazard', icon: '🌿' }
];

export default function FeedScreen({ navigation }: any) {
  const { role, user } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('nearby');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [feedCategoryDropdownOpen, setFeedCategoryDropdownOpen] = useState(false);
  const [feedMapModalOpen, setFeedMapModalOpen] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down' | null>>({});
  const [selectedUserModal, setSelectedUserModal] = useState<any | null>(null);

  useEffect(() => {
    loadSavedBookmarks();
    loadUserVotes();
  }, []);

  const loadUserVotes = async () => {
    try {
      const raw = await AsyncStorage.getItem('@user_votes');
      if (raw) {
        setUserVotes(JSON.parse(raw));
      }
    } catch (e) {}
  };

  const loadSavedBookmarks = async () => {
    try {
      const raw = await AsyncStorage.getItem('@saved_posts');
      if (raw) {
        const list: any[] = JSON.parse(raw);
        const map: Record<string, boolean> = {};
        list.forEach((item: any) => { map[item.id] = true; });
        setSavedPosts(map);
      }
    } catch (e) {}
  };

  const toggleSavePost = async (post: any) => {
    try {
      const postId = typeof post === 'string' ? post : post.id;
      const isCurrentlySaved = !!savedPosts[postId];
      const raw = await AsyncStorage.getItem('@saved_posts');
      let list: any[] = raw ? JSON.parse(raw) : [];

      if (isCurrentlySaved) {
        list = list.filter((p: any) => p.id !== postId);
        setSavedPosts((prev) => ({ ...prev, [postId]: false }));
        Alert.alert('Bookmark Removed', 'Post removed from saved bookmarks.');
      } else {
        const itemToSave = typeof post === 'object' ? post : {
          id: postId,
          title: post.title || 'Civic Incident',
          description: post.description || '',
          category: post.category || 'general',
          location: post.location_address || 'Bhopal'
        };
        list.push(itemToSave);
        setSavedPosts((prev) => ({ ...prev, [postId]: true }));
        Alert.alert('Post Saved! ⭐', 'Saved to your profile bookmarks tab.');
      }
      await AsyncStorage.setItem('@saved_posts', JSON.stringify(list));
    } catch (e) {
      console.warn('Toggle save error:', e);
    }
  };

  const handleShare = async (title: string, desc: string) => {
    try {
      await Share.share({
        title: title || 'Sahay Civic Issue',
        message: `Check out this civic issue on Sahay App:\n📌 ${title}\n📝 ${desc || 'Civic infrastructure report verified by citizens.'}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const fetchFeed = async () => {
    try {
      const res = await apiClient.get('/incidents');
      const items = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data?.data : (Array.isArray(res.data) ? res.data : []));
      setIncidents(items);
    } catch (e) {
      console.warn('Feed fetch error:', e);
      setIncidents([]);
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
      const currentVote = userVotes[id] || null;
      let action: 'add' | 'remove' | 'switch_from_down' | 'switch_from_up' = 'add';
      let nextVote: 'up' | 'down' | null = type;

      setIncidents((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            let up = item.upvotes_count || 0;
            let down = item.downvotes_count || 0;

            if (type === 'up') {
              if (currentVote === 'up') {
                up = Math.max(0, up - 1);
                action = 'remove';
                nextVote = null;
              } else if (currentVote === 'down') {
                up = up + 1;
                down = Math.max(0, down - 1);
                action = 'switch_from_down';
                nextVote = 'up';
              } else {
                up = up + 1;
                action = 'add';
                nextVote = 'up';
              }
            } else {
              if (currentVote === 'down') {
                down = Math.max(0, down - 1);
                action = 'remove';
                nextVote = null;
              } else if (currentVote === 'up') {
                down = down + 1;
                up = Math.max(0, up - 1);
                action = 'switch_from_up';
                nextVote = 'down';
              } else {
                down = down + 1;
                action = 'add';
                nextVote = 'down';
              }
            }

            return {
              ...item,
              upvotes_count: up,
              downvotes_count: down,
            };
          }
          return item;
        })
      );

      const updatedVotes = { ...userVotes, [id]: nextVote };
      setUserVotes(updatedVotes);
      await AsyncStorage.setItem('@user_votes', JSON.stringify(updatedVotes));

      await apiClient.post(`/incidents/${id}/vote`, { vote_type: type, action });
    } catch (e) {
      console.warn('Vote error:', e);
    }
  };

  const filteredIncidents = incidents
    .filter((item) => {
      if (selectedCategory !== 'all') {
        const cat = (item.category || '').toLowerCase();
        const sel = selectedCategory.toLowerCase();
        if (!cat.includes(sel) && !sel.includes(cat)) return false;
      }
      if (selectedFilter === 'following') {
        return !!savedPosts[item.id] || (item.upvotes_count || 0) > 0;
      }
      return true;
    })
    .sort((a, b) => {
      if (selectedFilter === 'trending') {
        return (b.upvotes_count || 0) - (a.upvotes_count || 0);
      }
      return 0;
    });

  // Calculate dynamic metrics from live incidents
  const totalCount = incidents.length;
  const resolvedCount = incidents.filter(i => ['resolved', 'closed', 'completed'].includes(i.status)).length;
  const activeRoads = incidents.filter(i => (i.category || '').toLowerCase().includes('road')).length;
  const activePower = incidents.filter(i => (i.category || '').toLowerCase().includes('light') || (i.category || '').toLowerCase().includes('power')).length;
  const activeWater = incidents.filter(i => (i.category || '').toLowerCase().includes('water') || (i.category || '').toLowerCase().includes('drain')).length;
  const resolvedRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 92;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Row (Left User Profile Avatar + Greeting, Right Notification Bell) */}
      <View style={styles.header}>
        <View style={styles.headerUserLeft}>
          <TouchableOpacity
            style={styles.headerAvatarBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.headerAvatarImg} />
            ) : (
              <View style={styles.headerAvatarBadge}>
                <Text style={styles.headerAvatarText}>
                  {(user?.name || user?.email || 'S').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View>
            <Text style={styles.headerGreetingSub}>Good Morning,</Text>
            <Text style={styles.headerUserName} numberOfLines={1}>
              {user?.name || user?.email || 'Seva Foundation NGO'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.notificationBellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Bell size={20} color="#7C3AED" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeed(); }} colors={['#7C3AED']} />
        }
      >
        {/* Two-Tone Hero Title */}
        <View style={styles.heroTitleContainer}>
          <Text style={styles.heroTitleDark}>How can Sahay help</Text>
          <Text style={styles.heroTitlePurple}>your ward today?</Text>
        </View>

        {/* Quick Action Card: Report Civic Issue */}
        <TouchableOpacity
          style={styles.quickActionCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Report')}
        >
          <View style={styles.quickActionLeft}>
            <View style={styles.quickActionIconCircle}>
              <Camera size={20} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.quickActionTitle}>Report Civic Issue</Text>
              <Text style={styles.quickActionSub}>Snap photo & instant AI analysis</Text>
            </View>
          </View>
          <View style={styles.quickActionArrowCircle}>
            <ChevronRight size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Today's Overview — compact horizontal stat pills */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Today's Overview</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statPillRow}
          style={{ marginBottom: 18 }}
        >
          {/* Road Issues */}
          <View style={[styles.statPill, { borderLeftColor: '#EF4444' }]}>
            <Text style={{ fontSize: 15 }}>🛣️</Text>
            <View>
              <Text style={styles.statPillValue}>{activeRoads}</Text>
              <Text style={styles.statPillLabel}>Roads</Text>
            </View>
          </View>

          {/* Power & Lights */}
          <View style={[styles.statPill, { borderLeftColor: '#F59E0B' }]}>
            <Zap size={16} color="#F59E0B" />
            <View>
              <Text style={styles.statPillValue}>{activePower}</Text>
              <Text style={styles.statPillLabel}>Lights</Text>
            </View>
          </View>

          {/* Water & Drainage */}
          <View style={[styles.statPill, { borderLeftColor: '#0284C7' }]}>
            <Droplets size={16} color="#0284C7" />
            <View>
              <Text style={styles.statPillValue}>{activeWater}</Text>
              <Text style={styles.statPillLabel}>Water</Text>
            </View>
          </View>

          {/* Resolved Ratio */}
          <View style={[styles.statPill, { borderLeftColor: '#7C3AED' }]}>
            <ShieldCheck size={16} color="#7C3AED" />
            <View>
              <Text style={styles.statPillValue}>{resolvedRate}%</Text>
              <Text style={styles.statPillLabel}>Resolved</Text>
            </View>
          </View>
        </ScrollView>

        {/* Filter Pills & Category Bar */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            <TouchableOpacity
              style={[styles.pill, selectedFilter === 'nearby' && styles.pillActive]}
              onPress={() => setSelectedFilter('nearby')}
            >
              <MapPin size={13} color={selectedFilter === 'nearby' ? '#FFFFFF' : '#7C3AED'} />
              <Text style={[styles.pillText, selectedFilter === 'nearby' && styles.pillTextActive]}>Nearby</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, selectedFilter === 'trending' && styles.pillActive]}
              onPress={() => setSelectedFilter('trending')}
            >
              <Flame size={13} color={selectedFilter === 'trending' ? '#FFFFFF' : '#D97706'} />
              <Text style={[styles.pillText, selectedFilter === 'trending' && styles.pillTextActive]}>Trending</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, selectedFilter === 'ward' && styles.pillActive]}
              onPress={() => setSelectedFilter('ward')}
            >
              <Building2 size={13} color={selectedFilter === 'ward' ? '#FFFFFF' : '#7C3AED'} />
              <Text style={[styles.pillText, selectedFilter === 'ward' && styles.pillTextActive]}>My Ward</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, selectedFilter === 'following' && styles.pillActive]}
              onPress={() => setSelectedFilter('following')}
            >
              <Users size={13} color={selectedFilter === 'following' ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.pillText, selectedFilter === 'following' && styles.pillTextActive]}>Saved</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Category Selector Bar */}
          <TouchableOpacity
            style={styles.categoryBar}
            onPress={() => setFeedCategoryDropdownOpen(true)}
          >
            <View style={styles.categoryBarLeft}>
              <Filter size={14} color="#7C3AED" />
              <Text style={styles.categoryBarTitle}>
                Category: {FEED_CATEGORIES.find(c => c.key === selectedCategory)?.name || 'All Categories'}
              </Text>
            </View>
            <View style={styles.selectBadgePill}>
              <Text style={styles.selectBadgeText}>Select</Text>
              <ChevronDown size={12} color="#7C3AED" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Hotspot Map Overview Card */}
        <View style={styles.mapOverviewCard}>
          <View style={styles.mapCardHeader}>
            <View style={styles.mapHeaderLeft}>
              <MapPin size={16} color="#7C3AED" />
              <Text style={styles.mapCardTitle}>Hotspot Map Overview</Text>
            </View>
            <View style={styles.livePinsBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.livePinsText}>{incidents.length} Active Pins</Text>
            </View>
          </View>

          <View style={styles.mapPreviewBox}>
            <MapPin size={30} color="#7C3AED" />
            <Text style={styles.mapPreviewSub}>
              Interactive Ward Hotspots • Real-time Pins
            </Text>

            <TouchableOpacity style={styles.exploreMapBtn} onPress={() => setFeedMapModalOpen(true)}>
              <Text style={styles.exploreMapText}>Explore Full Map ↗</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feed Section Title */}
        <View style={styles.feedTitleRow}>
          <Text style={styles.feedSectionTitle}>Community Incident Feed</Text>
          <Text style={styles.feedCountText}>{filteredIncidents.length} Items</Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Fetching live reports...</Text>
          </View>
        )}

        {/* Empty State Card */}
        {!loading && filteredIncidents.length === 0 && (
          <View style={styles.emptyCard}>
            <ShieldCheck size={40} color="#7C3AED" />
            <Text style={styles.emptyTitle}>No Civic Reports Found</Text>
            <Text style={styles.emptySub}>
              There are currently no reported issues matching your selected filter.
            </Text>
            <TouchableOpacity
              style={styles.emptyReportBtn}
              onPress={() => navigation.navigate('Report')}
            >
              <Text style={styles.emptyReportBtnText}>Report New Issue 📸</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dynamic Incidents List */}
        {!loading && filteredIncidents.map((item) => {
          const isSaved = !!savedPosts[item.id];
          const authorName = item.reporter?.name || item.reporter_name || 'Seva Foundation NGO';
          const authorInitials = authorName.split(/\s+/).filter(Boolean).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'SF';
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.issueCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}
            >
              <View style={styles.cardAuthorRow}>
                <TouchableOpacity
                  style={styles.authorMetaLeft}
                  onPress={() => setSelectedUserModal({
                    name: authorName,
                    email: item.reporter?.email || `${authorName.toLowerCase().replace(/\s+/g, '.')}@sahay.org`,
                    role: item.reporter?.role || 'verified_citizen',
                    avatar_url: item.reporter?.avatar_url,
                    ward_name: item.ward_name || 'Ward 12, Bhopal',
                  })}
                >
                  <View style={styles.authorAvatarCircle}>
                    {item.reporter?.avatar_url ? (
                      <Image source={{ uri: item.reporter.avatar_url }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                    ) : (
                      <Text style={styles.authorAvatarText}>
                        {authorInitials}
                      </Text>
                    )}
                  </View>
                  <View>
                    <Text style={styles.authorNameText}>{authorName}</Text>
                    <Text style={styles.categoryBadgeText}>{item.category || 'General Issue'}</Text>
                  </View>
                </TouchableOpacity>

                {item.priority_score ? (
                  <View style={styles.priorityPill}>
                    <Text style={styles.priorityPillText}>Priority {item.priority_score}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.issueTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.issueDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              {item.media_urls && item.media_urls[0] ? (
                <View style={styles.mediaContainer}>
                  <Image source={{ uri: item.media_urls[0] }} style={styles.mediaImage} />
                  <View style={styles.aiBadge}>
                    <Sparkles size={11} color="#FFFFFF" />
                    <Text style={styles.aiBadgeText}>AI Verified</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.locationRow}>
                <MapPin size={13} color="#7C3AED" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location_address || 'Bhopal, MP'}
                </Text>
              </View>

              <View style={styles.cardActionsRow}>
                {(() => {
                  const myVote = userVotes[item.id] || null;
                  return (
                    <>
                      <TouchableOpacity
                        style={[styles.voteActionBtn, myVote === 'up' && styles.voteActionBtnActive]}
                        onPress={() => handleVote(item.id, 'up')}
                      >
                        <ArrowUp size={15} color={myVote === 'up' ? '#FFFFFF' : '#7C3AED'} />
                        <Text style={[styles.voteCountText, myVote === 'up' && styles.voteCountTextActive]}>
                          Support ({item.upvotes_count || 0})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.voteActionBtn, myVote === 'down' && styles.voteActionBtnDownActive]}
                        onPress={() => handleVote(item.id, 'down')}
                      >
                        <ArrowDown size={15} color={myVote === 'down' ? '#FFFFFF' : '#EF4444'} />
                        <Text style={[styles.voteCountText, { color: myVote === 'down' ? '#FFFFFF' : '#EF4444' }]}>
                          {item.downvotes_count || 0}
                        </Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}

                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => toggleSavePost(item)}
                >
                  <Bookmark
                    size={16}
                    color={isSaved ? '#7C3AED' : '#64748B'}
                    fill={isSaved ? '#7C3AED' : 'transparent'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => handleShare(item.title, item.description)}
                >
                  <Share2 size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal visible={feedCategoryDropdownOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setFeedCategoryDropdownOpen(false)}>
                <X size={20} color="#1E1B4B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {FEED_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.categoryOption, isSelected && styles.categoryOptionActive]}
                    onPress={() => {
                      setSelectedCategory(cat.key);
                      setFeedCategoryDropdownOpen(false);
                    }}
                  >
                    <View style={styles.categoryOptionLeft}>
                      <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                      <Text style={[styles.categoryOptionText, isSelected && styles.categoryOptionTextActive]}>
                        {cat.name}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color="#7C3AED" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Interactive Map Modal */}
      <Modal visible={feedMapModalOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity onPress={() => setFeedMapModalOpen(false)}>
              <ChevronRight size={22} color="#1E1B4B" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Interactive Ward Hotspots</Text>
            <TouchableOpacity style={styles.mapDoneBtn} onPress={() => setFeedMapModalOpen(false)}>
              <Text style={styles.mapDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <MapView
              style={{ flex: 1 }}
              region={{
                latitude: 23.2599,
                longitude: 77.4126,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {incidents.map((inc) => (
                <Marker
                  key={inc.id}
                  coordinate={{
                    latitude: Number(inc.lat) || 23.2599,
                    longitude: Number(inc.lng) || 77.4126,
                  }}
                  title={inc.title}
                  description={`${inc.category || 'Issue'} • ${inc.status}`}
                  onCalloutPress={() => {
                    setFeedMapModalOpen(false);
                    navigation.navigate('IncidentDetail', { id: inc.id });
                  }}
                />
              ))}
            </MapView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* User Profile Lightbox Modal */}
      <UserProfileModal
        visible={!!selectedUserModal}
        onClose={() => setSelectedUserModal(null)}
        user={selectedUserModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FE',
  },
  header: {
    height: 60,
    backgroundColor: '#FAF8FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerGreetingSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  headerUserName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
    maxWidth: 200,
  },
  notificationBellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 150, // Clearance for bottom tab navigation bar
  },
  heroTitleContainer: {
    marginVertical: 12,
  },
  heroTitleDark: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: -0.5,
  },
  heroTitlePurple: {
    fontSize: 26,
    fontWeight: '900',
    color: '#7C3AED',
    letterSpacing: -0.5,
  },
  quickActionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  quickActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickActionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  quickActionSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  quickActionArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  statPillRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 3,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statPillValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E1B4B',
    lineHeight: 19,
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
  filterSection: {
    marginBottom: 16,
    gap: 10,
  },
  pillScroll: {
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  pillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  categoryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  categoryBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  selectBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  mapOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  livePinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  livePinsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  mapPreviewBox: {
    height: 110,
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapPreviewSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  exploreMapBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exploreMapText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  feedTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  feedSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  feedCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyReportBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  emptyReportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  issueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  authorNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#64748B',
  },
  priorityPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  issueTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 4,
  },
  issueDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  mediaContainer: {
    position: 'relative',
    marginVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: 170,
    borderRadius: 14,
  },
  aiBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8F6FF',
    marginTop: 4,
  },
  voteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF8FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  voteActionBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  voteActionBtnDownActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  voteCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  voteCountTextActive: {
    color: '#FFFFFF',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FAF8FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F6FF',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  categoryOptionActive: {
    backgroundColor: '#F3E8FF',
  },
  categoryOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  categoryOptionTextActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  mapModalHeader: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F6FF',
  },
  mapModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  mapDoneBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapDoneText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
