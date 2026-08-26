import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bell, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import apiClient from '../api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${diffWeeks}w ago`;
}

function getIcon(type: string) {
  const size = 22;
  switch (type) {
    case 'verification_approved':
      return <CheckCircle size={size} color="#22c55e" />;
    case 'verification_rejected':
      return <XCircle size={size} color="#ef4444" />;
    case 'alert':
      return <AlertTriangle size={size} color="#f59e0b" />;
    default:
      return <Bell size={size} color="#FF7E67" />;
  }
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get('/notifications');
      setNotifications(response.data.data);
    } catch {
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

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await apiClient.post(`/notifications/${id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      } catch {}
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <TouchableOpacity
        onPress={() => {
          if (!item.read) markAsRead(item.id);
        }}
        activeOpacity={0.7}
        className={`mx-4 mb-3 rounded-xl p-4 flex-row items-start ${
          item.read ? 'bg-white' : 'bg-orange-50'
        }`}
        style={
          !item.read
            ? { borderLeftWidth: 3, borderLeftColor: '#FF7E67' }
            : undefined
        }
      >
        <View className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          {getIcon(item.type)}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-base font-semibold text-gray-900 flex-1 mr-2"
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text className="text-xs text-gray-400">
              {getTimeAgo(item.created_at)}
            </Text>
          </View>
          <Text className="text-sm text-gray-600 leading-5" numberOfLines={3}>
            {item.body}
          </Text>
          {!item.read && (
            <View className="mt-2 self-start rounded-full bg-brand-orange/10 px-2 py-0.5">
              <Text className="text-xs font-medium text-brand-orange">New</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [markAsRead]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF7E67" />
        <Text className="mt-3 text-sm text-gray-500">
          Loading notifications...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Notifications</Text>
        {notifications.length > 0 && (
          <Text className="text-sm text-gray-500 mt-1">
            {notifications.filter((n) => !n.read).length} unread
          </Text>
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          notifications.length === 0 ? { flex: 1 } : { paddingTop: 16, paddingBottom: 32 }
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF7E67"
            colors={['#FF7E67']}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-orange-100 mb-4">
              <Bell size={32} color="#FF7E67" />
            </View>
            <Text className="text-lg font-semibold text-gray-700 text-center mb-2">
              No notifications yet
            </Text>
            <Text className="text-sm text-gray-400 text-center leading-5">
              You'll be notified when your reports are processed.
            </Text>
          </View>
        }
      />
    </View>
  );
}
