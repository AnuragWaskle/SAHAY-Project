import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Search, MapPin, AlertTriangle, Compass, Navigation, X, List, Map as MapIcon, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../api/client';

interface Incident {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: string;
  severity: string;
  priority_score: number;
  report_count: number;
  description?: string;
  ward_name?: string;
}

interface Mission {
  id: string;
  title: string;
  category: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  target: number;
  current_progress: number;
  description?: string;
}

const CATEGORIES = ['All', 'Cleanliness', 'Roads', 'Water', 'Safety', 'Streetlight', 'Drainage', 'Other'];

const BHOPAL_REGION = {
  latitude: 23.2599,
  longitude: 77.4126,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Default to list view on Web / desktop or allow toggling
  const [viewMode, setViewMode] = useState<'map' | 'list'>(Platform.OS === 'web' ? 'list' : 'map');

  // Drawer selection
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'incident' | 'mission' | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incRes, missRes] = await Promise.all([
        apiClient.get('/incidents'),
        apiClient.get('/missions?status=active'),
      ]);

      const rawData = incRes.data.data;
      const items = Array.isArray(rawData) ? rawData : (rawData?.items || []);
      setIncidents(items);

      if (missRes.data?.success) {
        setMissions(missRes.data.data.filter((m: any) => m.latitude && m.longitude));
      }
    } catch (error) {
      console.error('Failed to fetch map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesSearch =
        searchQuery === '' ||
        incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' ||
        incident.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [incidents, searchQuery, selectedCategory]);

  const filteredMissions = useMemo(() => {
    return missions.filter((mission) => {
      const matchesSearch =
        searchQuery === '' ||
        mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' ||
        mission.category.toLowerCase() === selectedCategory.toLowerCase() ||
        (selectedCategory.toLowerCase() === 'roads' && mission.category.toLowerCase() === 'road_damage') ||
        (selectedCategory.toLowerCase() === 'water' && mission.category.toLowerCase() === 'water_supply');

      return matchesSearch && matchesCategory;
    });
  }, [missions, searchQuery, selectedCategory]);

  const getSeverityBadge = (severity: string) => {
    switch ((severity || '').toLowerCase()) {
      case 'critical': return { bg: 'bg-red-500', text: 'text-white', label: 'Critical' };
      case 'high': return { bg: 'bg-orange-500', text: 'text-white', label: 'High' };
      case 'medium': return { bg: 'bg-amber-500', text: 'text-white', label: 'Medium' };
      case 'low': return { bg: 'bg-emerald-500', text: 'text-white', label: 'Low' };
      default: return { bg: 'bg-gray-500', text: 'text-white', label: severity || 'Active' };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch ((severity || '').toLowerCase()) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#F59E0B';
      case 'low': return '#16A34A';
      default: return '#6B7280';
    }
  };

  const handleLaunchNavigation = (lat: number, lng: number) => {
    const scheme = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
    });
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const url = scheme || webUrl;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(webUrl);
      }
    });
  };

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      {/* Header Search & Filter Bar */}
      <View className="pt-12 px-4 pb-3 bg-white border-b border-gray-100 shadow-sm z-20">
        <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-150">
          <Search size={18} color="#6B7280" />
          <TextInput
            className="flex-1 ml-3 text-sm font-semibold text-gray-800"
            placeholder="Search incidents or locations..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text className="text-brand-orange text-xs font-black uppercase">Clear</Text>
            </TouchableOpacity>
          )}

          {/* Toggle Map / List Mode Button */}
          <TouchableOpacity
            onPress={() => setViewMode(prev => prev === 'map' ? 'list' : 'map')}
            className="ml-2 px-3 py-1.5 bg-brand-orange/10 rounded-xl flex-row items-center"
          >
            {viewMode === 'map' ? (
              <>
                <List size={14} color="#FF7E67" />
                <Text className="ml-1 text-[11px] font-extrabold text-brand-orange uppercase">List</Text>
              </>
            ) : (
              <>
                <MapIcon size={14} color="#FF7E67" />
                <Text className="ml-1 text-[11px] font-extrabold text-brand-orange uppercase">Map</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={`mr-2 px-4 py-2 rounded-full border border-transparent ${
                selectedCategory === category
                  ? 'bg-brand-orange shadow-md'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              <Text
                className={`text-xs font-black uppercase tracking-wider ${
                  selectedCategory === category ? 'text-white' : 'text-gray-700'
                }`}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content Area: Map View OR List View */}
      {viewMode === 'map' && Platform.OS !== 'web' ? (
        <MapView
          className="flex-1"
          initialRegion={BHOPAL_REGION}
          showsUserLocation
          showsMyLocationButton
          onPress={() => {
            setSelectedItem(null);
            setSelectedType(null);
          }}
        >
          {filteredIncidents.map((incident, index) => (
            <Marker
              key={`incident-${index}`}
              coordinate={{ latitude: incident.lat, longitude: incident.lng }}
              pinColor={getSeverityColor(incident.severity)}
              onPress={() => {
                setSelectedItem(incident);
                setSelectedType('incident');
              }}
            />
          ))}

          {filteredMissions.map((mission, index) => (
            <Marker
              key={`mission-${index}`}
              coordinate={{ latitude: mission.latitude!, longitude: mission.longitude! }}
              pinColor="#10B981"
              onPress={() => {
                setSelectedItem(mission);
                setSelectedType('mission');
              }}
            />
          ))}
        </MapView>
      ) : (
        /* List View (Render cards list) */
        <ScrollView className="flex-1 px-4 pt-4 pb-28">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-xs font-black uppercase tracking-wider text-gray-500">
              {filteredIncidents.length + filteredMissions.length} Active Issues & Missions
            </Text>
            <TouchableOpacity onPress={() => setViewMode('map')} className="flex-row items-center">
              <MapPin size={12} color="#FF7E67" />
              <Text className="text-[11px] font-extrabold text-brand-orange ml-1 uppercase">Switch to Map</Text>
            </TouchableOpacity>
          </View>

          {filteredIncidents.length === 0 && filteredMissions.length === 0 ? (
            <View className="bg-white p-8 rounded-3xl items-center justify-center my-6 border border-gray-100">
              <AlertTriangle size={36} color="#F59E0B" />
              <Text className="text-gray-800 font-black text-base mt-3">No Issues Found</Text>
              <Text className="text-gray-400 text-xs text-center font-medium mt-1">
                No active incidents match your selected filters. Try clearing search or choosing "All".
              </Text>
            </View>
          ) : (
            filteredIncidents.map((incident) => {
              const badge = getSeverityBadge(incident.severity);
              return (
                <TouchableOpacity
                  key={incident.id}
                  onPress={() => navigation.navigate('IncidentDetail', { incidentId: incident.id })}
                  className="bg-white rounded-3xl p-5 mb-3.5 shadow-sm border border-gray-100"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className={`${badge.bg} px-2.5 py-1 rounded-full mr-2`}>
                        <Text className={`text-[10px] font-black uppercase ${badge.text}`}>
                          {badge.label}
                        </Text>
                      </View>
                      <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider capitalize">
                        {incident.category}
                      </Text>
                    </View>
                    {incident.ward_name && (
                      <View className="flex-row items-center bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                        <MapPin size={10} color="#6B7280" />
                        <Text className="text-gray-500 font-extrabold text-[10px] ml-1">{incident.ward_name}</Text>
                      </View>
                    )}
                  </View>

                  <Text className="text-base font-extrabold text-gray-900 leading-snug mb-1">
                    {incident.title}
                  </Text>

                  {incident.description && (
                    <Text className="text-xs text-gray-500 font-medium leading-relaxed mb-3" numberOfLines={2}>
                      {incident.description}
                    </Text>
                  )}

                  <View className="flex-row items-center justify-between pt-3 border-t border-gray-50">
                    <View className="flex-row items-center space-x-3">
                      <Text className="text-xs font-extrabold text-brand-orange">
                        🔥 Score: {Math.round(incident.priority_score || 50)}
                      </Text>
                      <Text className="text-xs font-bold text-gray-400">
                        👥 {incident.report_count || 1} Reports
                      </Text>
                    </View>

                    <View className="flex-row items-center text-brand-orange font-black text-xs">
                      <Text className="text-brand-orange font-black text-xs uppercase mr-1">View</Text>
                      <ChevronRight size={14} color="#FF7E67" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-white/70 z-30">
          <ActivityIndicator size="large" color="#FF7E67" />
          <Text className="mt-3 text-gray-600 font-medium">Loading civic issues...</Text>
        </View>
      )}

      {/* Bottom Panel Drawer for Selected Item (when in Map mode) */}
      {viewMode === 'map' && selectedItem && (
        <View className="absolute bottom-28 left-4 right-4 z-20">
          <View
            className="bg-white rounded-[26px] p-5 shadow-2xl border border-gray-100"
            style={{ elevation: 12 }}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <View className={`px-2 py-0.5 rounded border mr-2 ${
                    selectedType === 'mission'
                      ? 'bg-emerald-50 border-emerald-100'
                      : 'bg-orange-50 border-orange-100'
                  }`}>
                    <Text className={`text-[9px] font-black uppercase ${
                      selectedType === 'mission' ? 'text-emerald-700' : 'text-brand-orange'
                    }`}>
                      {selectedType}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider capitalize">{selectedItem.category}</Text>
                </View>
                <Text className="text-base font-extrabold text-gray-900 leading-tight">{selectedItem.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedItem(null);
                  setSelectedType(null);
                }}
                className="w-7 h-7 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
              >
                <X size={12} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {selectedItem.description && (
              <Text className="text-xs text-gray-500 font-medium leading-relaxed mb-4" numberOfLines={2}>{selectedItem.description}</Text>
            )}

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={() => {
                  const screenName = selectedType === 'mission' ? 'MissionDetail' : 'IncidentDetail';
                  const params = selectedType === 'mission' ? { missionId: selectedItem.id } : { incidentId: selectedItem.id };
                  navigation.navigate(screenName, params);
                }}
                className="flex-1 bg-gray-50 border border-gray-150 py-3 rounded-xl flex-row items-center justify-center"
              >
                <Compass size={14} color="#4B5563" />
                <Text className="text-gray-700 font-extrabold text-xs ml-2 uppercase">View Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const lat = selectedItem.lat || selectedItem.latitude;
                  const lng = selectedItem.lng || selectedItem.longitude;
                  if (lat && lng) handleLaunchNavigation(lat, lng);
                }}
                className="flex-1 bg-brand-orange py-3 rounded-xl flex-row items-center justify-center shadow-sm"
              >
                <Navigation size={14} color="#FFF" />
                <Text className="text-white font-extrabold text-xs ml-2 uppercase">GPS Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Status & Toggle Bar */}
      <View className="absolute bottom-28 left-4 right-4 z-10">
        {!selectedItem && (
          <View className="bg-white rounded-2xl px-4 py-3 shadow-lg flex-row items-center justify-between border border-gray-100">
            <View className="flex-row items-center">
              <MapPin size={15} color="#FF7E67" />
              <Text className="ml-2 text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                {filteredIncidents.length + filteredMissions.length} Pins Found
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setViewMode(prev => prev === 'map' ? 'list' : 'map')}
              className="flex-row items-center bg-brand-orange/10 px-3 py-1.5 rounded-xl border border-brand-orange/20"
            >
              <AlertTriangle size={13} color="#EA580C" />
              <Text className="ml-1.5 text-[10px] font-black text-brand-orange uppercase tracking-wider">
                {viewMode === 'map' ? 'Switch to List View' : 'Switch to Map View'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
