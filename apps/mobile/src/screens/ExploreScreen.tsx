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
  Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Search, MapPin, AlertTriangle, Compass, Navigation, X } from 'lucide-react-native';
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

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
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
    <View className="flex-1 bg-white">
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

      {/* Header filter tags search */}
      <View className="absolute top-16 left-4 right-4">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 shadow-lg border border-gray-100">
          <Search size={18} color="#6B7280" />
          <TextInput
            className="flex-1 ml-3 text-sm font-semibold text-gray-700 outline-none"
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
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3.5"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={`mr-2 px-4.5 py-2.5 rounded-full border border-transparent ${
                selectedCategory === category
                  ? 'bg-brand-orange shadow-md'
                  : 'bg-white border-gray-100 shadow-sm'
              }`}
            >
              <Text
                className={`text-xs font-black uppercase tracking-wider ${
                  selectedCategory === category ? 'text-white' : 'text-gray-650'
                }`}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-white/70">
          <ActivityIndicator size="large" color="#FF7E67" />
          <Text className="mt-3 text-gray-600 font-medium">Loading map pins...</Text>
        </View>
      )}

      {/* Bottom Panel */}
      <View className="absolute bottom-28 left-4 right-4">
        {selectedItem ? (
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
        ) : (
          /* Default Status bar */
          <View className="bg-white rounded-2xl px-4 py-3 shadow-lg flex-row items-center justify-between border border-gray-100">
            <View className="flex-row items-center">
              <MapPin size={15} color="#FF7E67" />
              <Text className="ml-2 text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                {filteredIncidents.length + filteredMissions.length} Pins Found
              </Text>
            </View>
            <View className="flex-row items-center">
              <AlertTriangle size={13} color="#EA580C" />
              <Text className="ml-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">Bhopal Ward Map</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
