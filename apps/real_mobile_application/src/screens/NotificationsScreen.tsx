import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Gift,
  MessageSquare,
  Flag,
  Award,
  Info,
  Trash2,
} from 'lucide-react-native';
import apiClient from '../api/client';

// ─── Notification type → icon/color mapping ─────────────────────
const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  verification_approved: {
    icon: <ShieldCheck size={20} color="#059669" />,
    color: '#059669',
    bg: '#D1FAE5',
  },
  verification_rejected: {
    icon: <AlertTriangle size={20} color="#DC2626" />,
    color: '#DC2626',
    bg: '#FEE2E2',
  },
  incident_resolved: {
    icon: <CheckCheck size={20} color="#2563EB" />,
    color: '#2563EB',
    bg: '#DBEAFE',
  },
  incident_updated: {
    icon: <AlertTriangle size={20} color="#D97706" />,
    color: '#D97706',
    bg: '#FEF3C7',
  },
  new_comment: {
    icon: <MessageSquare size={20} color="#7C3AED" />,
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  credits_earned: {
    icon: <Zap size={20} color="#F59E0B" />,
    color: '#F59E0B',
    bg: '#FEF3C7',
  },
  reward_redeemed: {
    icon: <Gift size={20} color="#EC4899" />,
    color: '#EC4899',
    bg: '#FCE7F3',
  },
  badge_earned: {
    icon: <Award size={20} color="#7C3AED" />,
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  content_flagged: {
    icon: <Flag size={20} color="#DC2626" />,
    color: '#DC2626',
    bg: '#FEE2E2',
  },
};

const DEFAULT_META = {
  icon: <Info size={20} color="#6B7280" />,
  color: '#6B7280',
  bg: '#F3F4F6',
};

function getMeta(type: string) {
  return TYPE_META[type] || DEFAULT_META;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications');
      const data = res.data?.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Notifications fetch error:', e);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.warn('Mark read error:', e);
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(unread.map((n) => apiClient.post(`/notifications/${n.id}/read`)));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.warn('Mark all read error:', e);
      Alert.alert('Error', 'Failed to mark all as read. Please try again.');
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const meta = getMeta(item.type);
    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => !item.read && markAsRead(item.id)}
        activeOpacity={0.8}
      >
        {/* Unread indicator */}
        {!item.read && <View style={styles.unreadDot} />}

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          {meta.icon}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, !item.read && styles.titleUnread]}>
            {item.title || 'Notification'}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {item.body || ''}
          </Text>
          <View style={styles.footer}>
            <Text style={[styles.typeTag, { color: meta.color }]}>
              {item.type?.replace(/_/g, ' ') || 'general'}
            </Text>
            <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>

        {/* Mark read button */}
        {!item.read && (
          <TouchableOpacity
            onPress={() => markAsRead(item.id)}
            style={styles.checkBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CheckCheck size={18} color="#7C3AED" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Text style={styles.headerSub}>{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</Text>
        ) : (
          <Text style={styles.headerSub}>All caught up ✓</Text>
        )}
      </View>
      {unreadCount > 0 && (
        <TouchableOpacity
          onPress={markAllRead}
          style={styles.markAllBtn}
          disabled={markingAll}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <>
              <CheckCheck size={15} color="#7C3AED" />
              <Text style={styles.markAllText}>Mark all read</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Bell size={44} color="#C4B5FD" />
      </View>
      <Text style={styles.emptyTitle}>No Notifications Yet</Text>
      <Text style={styles.emptyBody}>
        You'll be alerted here when incidents are updated, comments are added, credits are earned, and more.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderItem}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={<ListEmpty />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7C3AED"
            colors={['#7C3AED']}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
    position: 'relative',
  },
  cardUnread: {
    backgroundColor: '#FEFCE8',
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    lineHeight: 20,
  },
  titleUnread: {
    color: '#1E1B4B',
    fontWeight: '800',
  },
  body: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  typeTag: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  checkBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignSelf: 'center',
    flexShrink: 0,
  },
  separator: {
    height: 10,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E1B4B',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
});
