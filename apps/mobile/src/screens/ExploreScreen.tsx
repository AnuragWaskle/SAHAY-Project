import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Search, MapPin, AlertTriangle } from 'lucide-react-native';
import apiClient from '../api/client';

interface Incident {
  lat: number;
  lng: number;
  title: string;
  category: string;
  severity: string;
  priority_score: number;
  report_count: number;
}

const CATEGORIES = ['All', 'Pothole', 'Garbage', 'Water', 'Electricity', 'Road', 'Drainage', 'Other'];

const BHOPAL_REGION = {
  latitude: 23.2599,
  longitude: 77.4126,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function ExploreScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/incidents');
      const rawData = response.data.data;
      const items = Array.isArray(rawData) ? rawData : (rawData?.items || []);
      setIncidents(items);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
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

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EA580C';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  return (
    <View className="flex-1 bg-white">
      <MapView
        className="flex-1"
        initialRegion={BHOPAL_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {filteredIncidents.map((incident, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: incident.lat, longitude: incident.lng }}
            pinColor={getSeverityColor(incident.severity)}
          >
            <Callout>
              <View className="p-2 min-w-[200px]">
                <Text className="font-bold text-base text-gray-900">{incident.title}</Text>
                <View className="flex-row items-center mt-1">
                  <View
                    className="px-2 py-0.5 rounded-full mr-2"
                    style={{ backgroundColor: getSeverityColor(incident.severity) + '20' }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: getSeverityColor(incident.severity) }}
                    >
                      {incident.severity}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">{incident.category}</Text>
                </View>
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-xs text-gray-600">
                    Priority: {incident.priority_score}/10
                  </Text>
                  <Text className="text-xs text-gray-600">
                    {incident.report_count} reports
                  </Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View className="absolute top-12 left-4 right-4">
        <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-lg">
          <Search size={20} color="#6B7280" />
          <TextInput
            className="flex-1 ml-3 text-base text-gray-900"
            placeholder="Search incidents..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text className="text-brand-orange font-medium">Clear</Text>
            </TouchableOpacity>
          )}
        </View>

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
              className={`mr-2 px-4 py-2 rounded-full ${
                selectedCategory === category
                  ? 'bg-brand-orange'
                  : 'bg-white'
              }`}
              style={
                selectedCategory !== category
                  ? { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }
                  : undefined
              }
            >
              <Text
                className={`text-sm font-medium ${
                  selectedCategory === category ? 'text-white' : 'text-gray-700'
                }`}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-white/80">
          <ActivityIndicator size="large" color="#FF7E67" />
          <Text className="mt-3 text-gray-600 font-medium">Loading incidents...</Text>
        </View>
      )}

      <View className="absolute bottom-8 left-4 right-4">
        <View className="bg-white rounded-xl px-4 py-3 shadow-lg flex-row items-center justify-between">
          <View className="flex-row items-center">
            <MapPin size={16} color="#FF7E67" />
            <Text className="ml-2 text-sm font-medium text-gray-700">
              {filteredIncidents.length} incidents found
            </Text>
          </View>
          <View className="flex-row items-center">
            <AlertTriangle size={14} color="#EA580C" />
            <Text className="ml-1 text-xs text-gray-500">Bhopal</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
