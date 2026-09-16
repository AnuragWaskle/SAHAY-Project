import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Share,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  MapPin,
  Sparkles,
  ShieldCheck,
  Flame,
  ArrowUp,
  ArrowDown,
  Bookmark,
  Share2,
  X,
  SlidersHorizontal,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Check,
  Filter,
  Ticket,
  User,
  ExternalLink
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const DISCOVER_CATEGORIES = [
  { name: 'All Categories', key: 'all', icon: '🌐' },
  { name: 'Roads & Potholes', key: 'road', icon: '🛣️' },
  { name: 'Electricity & Power', key: 'light', icon: '⚡' },
  { name: 'Water & Sewage', key: 'water', icon: '🚰' },
  { name: 'Sanitation & Waste', key: 'garbage', icon: '🧹' },
  { name: 'Public Safety', key: 'safety', icon: '🛡️' },
  { name: 'Parks & Environment', key: 'tree', icon: '🌿' }
];

const DISCOVER_STATUSES = [
  { name: 'All Statuses', key: 'all', icon: '📋' },
  { name: 'High Priority', key: 'critical', icon: '🚨' },
  { name: 'In Progress', key: 'in_progress', icon: '⏳' },
  { name: 'Resolved', key: 'resolved', icon: '✅' }
];

export default function DiscoverScreen({ navigation }: any) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, critical, in_progress, resolved
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down' | null>>({});

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  useEffect(() => {
    loadSavedBookmarks();
    loadUserVotes();
    fetchIncidents();
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

  const fetchIncidents = async () => {
    try {
      const res = await apiClient.get('/incidents');
      const items = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data?.data : (Array.isArray(res.data) ? res.data : []));
      setIncidents(items);
    } catch (e) {
      console.warn('Discover fetch error:', e);
      setIncidents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  // Dynamic filter logic
  const filteredIncidents = incidents.filter((item) => {
    // Search query matching title, category, location, description, reporter_name, or ticket ID
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace('#', '');
      const titleMatch = (item.title || '').toLowerCase().includes(q);
      const descMatch = (item.description || '').toLowerCase().includes(q);
      const catMatch = (item.category || '').toLowerCase().includes(q);
      const locMatch = (item.location_address || '').toLowerCase().includes(q);
      const reporterMatch = (item.reporter_name || '').toLowerCase().includes(q);
      const idMatch = (item.id || '').toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !catMatch && !locMatch && !reporterMatch && !idMatch) return false;
    }

    // Category filter
    if (selectedCategory !== 'all') {
      const cat = (item.category || '').toLowerCase();
      const sel = selectedCategory.toLowerCase();
      if (sel === 'road' && !cat.includes('road') && !cat.includes('pothole')) return false;
      if (sel === 'light' && !cat.includes('light') && !cat.includes('power') && !cat.includes('street')) return false;
      if (sel === 'water' && !cat.includes('water') && !cat.includes('drain') && !cat.includes('sewag')) return false;
      if (sel === 'garbage' && !cat.includes('garb') && !cat.includes('trash') && !cat.includes('sanitat')) return false;
      if (sel === 'safety' && !cat.includes('safe') && !cat.includes('hazard')) return false;
      if (sel === 'tree' && !cat.includes('tree') && !cat.includes('park') && !cat.includes('environ')) return false;
      if (sel !== 'road' && sel !== 'light' && sel !== 'water' && sel !== 'garbage' && sel !== 'safety' && sel !== 'tree') {
        if (!cat.includes(sel) && !sel.includes(cat)) return false;
      }
    }

    // Status filter
    if (selectedStatus === 'critical') {
      return (Number(item.priority_score) || 0) >= 8.0;
    }
    if (selectedStatus === 'in_progress') {
      return item.status === 'in_progress' || item.status === 'assigned';
    }
    if (selectedStatus === 'resolved') {
      return ['resolved', 'closed', 'completed'].includes(item.status);
    }

    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Compass size={22} color="#7C3AED" />
          <Text style={styles.headerTitle}>Discover Reports & Tickets</Text>
        </View>
        <Text style={styles.headerSub}>Search civic issues, tickets, and user reports across all wards</Text>
      </View>

      {/* Sticky Search Bar & Dropdown Selectors */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <Search size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets, users, location, or keywords..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Dropdown Selectors Row */}
        <View style={styles.dropdownRow}>
          {/* Category Dropdown */}
          <TouchableOpacity
            style={[
              styles.dropdownSelector,
              selectedCategory !== 'all' && styles.dropdownSelectorActive
            ]}
            onPress={() => setCategoryModalOpen(true)}
          >
            <View style={styles.dropdownLeft}>
              <Filter size={14} color={selectedCategory !== 'all' ? '#7C3AED' : '#64748B'} />
              <Text style={styles.dropdownLabelPrefix}>Category:</Text>
              <Text style={styles.dropdownSelectedValue} numberOfLines={1}>
                {DISCOVER_CATEGORIES.find((c) => c.key === selectedCategory)?.name || 'All'}
              </Text>
            </View>
            <ChevronDown size={16} color={selectedCategory !== 'all' ? '#7C3AED' : '#64748B'} />
          </TouchableOpacity>

          {/* Status Dropdown */}
          <TouchableOpacity
            style={[
              styles.dropdownSelector,
              selectedStatus !== 'all' && styles.dropdownSelectorActive
            ]}
            onPress={() => setStatusModalOpen(true)}
          >
            <View style={styles.dropdownLeft}>
              <SlidersHorizontal size={14} color={selectedStatus !== 'all' ? '#7C3AED' : '#64748B'} />
              <Text style={styles.dropdownLabelPrefix}>Status:</Text>
              <Text style={styles.dropdownSelectedValue} numberOfLines={1}>
                {DISCOVER_STATUSES.find((s) => s.key === selectedStatus)?.name || 'All'}
              </Text>
            </View>
            <ChevronDown size={16} color={selectedStatus !== 'all' ? '#7C3AED' : '#64748B'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Discover Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchIncidents(); }} colors={['#7C3AED']} />
        }
      >
        <View style={styles.resultsCountRow}>
          <Text style={styles.resultsCountText}>Found {filteredIncidents.length} matching civic tickets</Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Searching community database...</Text>
          </View>
        )}

        {!loading && filteredIncidents.length === 0 && (
          <View style={styles.emptyCard}>
            <Search size={40} color="#7C3AED" />
            <Text style={styles.emptyTitle}>No Matching Reports</Text>
            <Text style={styles.emptySub}>
              No civic issues match your search criteria. Try clearing search filters or checking back later.
            </Text>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
            >
              <Text style={styles.clearBtnText}>Reset All Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && filteredIncidents.map((item) => {
          const isSaved = !!savedPosts[item.id];
          const ticketId = `#TKT-${(item.id || '101').slice(0, 6).toUpperCase()}`;
          const reporter = item.reporter_name || item.reporter?.name || 'Seva Foundation NGO';
          const authorInitials = reporter.split(/\s+/).filter(Boolean).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'SF';
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.issueCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('IncidentDetail', { id: item.id })}
            >
              {/* Ticket Top Author & Ticket ID Band */}
              <View style={styles.ticketHeaderRow}>
                <View style={styles.ticketAuthorLeft}>
                  <View style={styles.authorAvatarCircle}>
                    <Text style={styles.authorAvatarText}>{authorInitials}</Text>
                  </View>
                  <View>
                    <Text style={styles.authorName}>{reporter}</Text>
                    <Text style={styles.ticketCategorySub}>{item.category || 'General Issue'}</Text>
                  </View>
                </View>

                <View style={styles.ticketIdBadge}>
                  <Ticket size={12} color="#7C3AED" />
                  <Text style={styles.ticketIdText}>{ticketId}</Text>
                </View>
              </View>

              {/* Status and Priority Pill Row */}
              <View style={styles.cardHeaderRow}>
                <View style={[styles.statusBadge, item.status === 'in_progress' ? styles.statusBadgeProgress : item.status === 'resolved' ? styles.statusBadgeResolved : styles.statusBadgeActive]}>
                  <View style={[styles.statusDot, item.status === 'in_progress' ? styles.statusDotProgress : item.status === 'resolved' ? styles.statusDotResolved : styles.statusDotActive]} />
                  <Text style={[styles.statusBadgeText, item.status === 'in_progress' ? styles.statusBadgeTextProgress : item.status === 'resolved' ? styles.statusBadgeTextResolved : styles.statusBadgeTextActive]}>
                    {item.status === 'in_progress' ? 'In Progress' : item.status === 'resolved' ? 'Resolved' : 'Active Ticket'}
                  </Text>
                </View>

                {item.priority_score ? (
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityBadgeText}>Priority {item.priority_score}</Text>
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
                <View style={styles.mediaWrapper}>
                  <Image source={{ uri: item.media_urls[0] }} style={styles.mediaImg} />
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

              {/* Action Toolbar */}
              <View style={styles.cardActionsRow}>
                {(() => {
                  const myVote = userVotes[item.id] || null;
                  return (
                    <>
                      <TouchableOpacity
                        style={[styles.voteBtn, myVote === 'up' && styles.voteBtnActive]}
                        onPress={() => handleVote(item.id, 'up')}
                      >
                        <ArrowUp size={14} color={myVote === 'up' ? '#FFFFFF' : '#7C3AED'} />
                        <Text style={[styles.voteText, myVote === 'up' && styles.voteTextActive]}>
                          Support ({item.upvotes_count || 0})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.voteBtn, myVote === 'down' && styles.voteBtnDownActive]}
                        onPress={() => handleVote(item.id, 'down')}
                      >
                        <ArrowDown size={14} color={myVote === 'down' ? '#FFFFFF' : '#EF4444'} />
                        <Text style={[styles.voteText, { color: myVote === 'down' ? '#FFFFFF' : '#EF4444' }]}>
                          {item.downvotes_count || 0}
                        </Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}

                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => toggleSavePost(item)}
                >
                  <Bookmark
                    size={16}
                    color={isSaved ? '#7C3AED' : '#64748B'}
                    fill={isSaved ? '#7C3AED' : 'transparent'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => handleShare(item.title, item.description)}
                >
                  <Share2 size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category Dropdown Modal */}
      <Modal visible={categoryModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModalOpen(false)}>
                <X size={20} color="#1E1B4B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {DISCOVER_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionActive]}
                    onPress={() => {
                      setSelectedCategory(cat.key);
                      setCategoryModalOpen(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                      <Text style={[styles.dropdownOptionLabel, isSelected && styles.dropdownOptionLabelActive]}>
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

      {/* Status Dropdown Modal */}
      <Modal visible={statusModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setStatusModalOpen(false)}>
                <X size={20} color="#1E1B4B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {DISCOVER_STATUSES.map((st) => {
                const isSelected = selectedStatus === st.key;
                return (
                  <TouchableOpacity
                    key={st.key}
                    style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionActive]}
                    onPress={() => {
                      setSelectedStatus(st.key);
                      setStatusModalOpen(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 18 }}>{st.icon}</Text>
                      <Text style={[styles.dropdownOptionLabel, isSelected && styles.dropdownOptionLabelActive]}>
                        {st.name}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FE',
  },
  header: {
    backgroundColor: '#FAF8FE',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  searchSection: {
    backgroundColor: '#FAF8FE',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E1B4B',
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dropdownSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  dropdownSelectorActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dropdownLabelPrefix: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  dropdownSelectedValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1B4B',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 150, // Clearance for floating bottom bar
  },
  resultsCountRow: {
    marginBottom: 8,
  },
  resultsCountText: {
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
    marginVertical: 16,
  },
  emptyTitle: {
    fontSize: 16,
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
  clearBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F6FF',
  },
  ticketAuthorLeft: {
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
    fontSize: 13,
    fontWeight: '800',
    color: '#7C3AED',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  ticketCategorySub: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  ticketIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ticketIdText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: '#F3E8FF',
  },
  statusBadgeProgress: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeResolved: {
    backgroundColor: '#D1FAE5',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#7C3AED',
  },
  statusDotProgress: {
    backgroundColor: '#D97706',
  },
  statusDotResolved: {
    backgroundColor: '#10B981',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextActive: {
    color: '#7C3AED',
  },
  statusBadgeTextProgress: {
    color: '#D97706',
  },
  statusBadgeTextResolved: {
    color: '#10B981',
  },
  priorityBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityBadgeText: {
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
  mediaWrapper: {
    position: 'relative',
    marginVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  mediaImg: {
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
    fontWeight: '700',
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
  voteBtn: {
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
  voteBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  voteBtnDownActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  voteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  voteTextActive: {
    color: '#FFFFFF',
  },
  iconActionBtn: {
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8FF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  dropdownOptionActive: {
    backgroundColor: '#F3E8FF',
  },
  dropdownOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  dropdownOptionLabelActive: {
    fontWeight: '800',
    color: '#7C3AED',
  },
});
