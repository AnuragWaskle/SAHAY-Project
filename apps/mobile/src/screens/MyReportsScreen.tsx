import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  AlertTriangle,
  Droplets,
  Zap,
  Trash2,
  Construction,
  TreePine,
  Link,
  FileText,
} from 'lucide-react-native';
import apiClient from '../api/client';

interface Report {
  id: string;
  category: string;
  description: string;
  status: 'ai_processed' | 'clustered' | 'resolved' | 'rejected';
  created_at: string;
  media_urls: string | string[] | null;
  incident_id: string | null;
  lat: number;
  lng: number;
  ward_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-700' },
  clustered: { label: 'Clustered', bg: 'bg-blue-100', text: 'text-blue-700' },
  ai_processed: { label: 'Processing', bg: 'bg-orange-100', text: 'text-orange-700' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700' },
};

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; emoji: string }> = {
  pothole: { icon: AlertTriangle, emoji: '🕳️' },
  water_leak: { icon: Droplets, emoji: '💧' },
  electricity: { icon: Zap, emoji: '⚡' },
  garbage: { icon: Trash2, emoji: '🗑️' },
  road_damage: { icon: Construction, emoji: '🚧' },
  tree_fall: { icon: TreePine, emoji: '🌳' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function parseMediaUrls(media: string | string[] | null): string[] {
  if (!media) return [];
  if (Array.isArray(media)) return media;
  try {
    const parsed = JSON.parse(media);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ReportCard({ report }: { report: Report }) {
  const statusConfig = STATUS_CONFIG[report.status] || STATUS_CONFIG.ai_processed;
  const categoryConfig = CATEGORY_ICONS[report.category];
  const mediaUrls = parseMediaUrls(report.media_urls);
  const thumbnail = mediaUrls.length > 0 ? mediaUrls[0] : null;

  return (
    <View className="bg-white rounded-2xl mx-4 mb-3 p-4 shadow-sm border border-gray-100">
      <View className="flex-row items-start">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <Text className="text-lg mr-2">
              {categoryConfig?.emoji || '📋'}
            </Text>
            <Text className="text-sm font-semibold text-gray-800 capitalize flex-1">
              {report.category?.replace(/_/g, ' ') || 'Report'}
            </Text>
            <Text className="text-xs text-gray-400">
              {formatDate(report.created_at)}
            </Text>
          </View>

          <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
            {report.description}
          </Text>

          <View className="flex-row items-center flex-wrap gap-2">
            <View className={`px-2.5 py-1 rounded-full ${statusConfig.bg}`}>
              <Text className={`text-xs font-medium ${statusConfig.text}`}>
                {statusConfig.label}
              </Text>
            </View>

            {report.incident_id && (
              <View className="flex-row items-center px-2.5 py-1 rounded-full bg-purple-100">
                <Link size={10} color="#7c3aed" />
                <Text className="text-xs font-medium text-purple-700 ml-1">
                  Linked to Incident
                </Text>
              </View>
            )}

            {report.ward_name && (
              <Text className="text-xs text-gray-400">
                {report.ward_name}
              </Text>
            )}
          </View>
        </View>

        {thumbnail && (
          <Image
            source={{ uri: thumbnail }}
            className="w-16 h-16 rounded-xl ml-3"
            resizeMode="cover"
          />
        )}
      </View>
    </View>
  );
}

export default function MyReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const res = await apiClient.get('/reports/mine');
      const rawData = res.data?.data;
      const items: Report[] = Array.isArray(rawData) ? rawData : (rawData?.items || []);
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setReports(items);
    } catch (e) {
      console.error('Failed to fetch reports', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF7E67" />
        <Text className="text-sm text-gray-400 mt-3">Loading your reports...</Text>
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <FileText size={64} color="#d1d5db" />
        <Text className="text-lg font-semibold text-gray-600 mt-4 text-center">
          No Reports Yet
        </Text>
        <Text className="text-sm text-gray-400 mt-2 text-center leading-5">
          You haven't reported any issues yet. Tap the + button to get started!
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">My Reports</Text>
        <Text className="text-sm text-gray-400 mt-1">
          {reports.length} {reports.length === 1 ? 'report' : 'reports'} submitted
        </Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReportCard report={item} />}
        contentContainerClassName="pb-6 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF7E67"
            colors={['#FF7E67']}
          />
        }
      />
    </View>
  );
}
