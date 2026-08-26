import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera, MapPin, Send, AlertTriangle, CheckCircle, Video, Image as LucideImage, Navigation } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';

const CATEGORIES = [
  { key: 'pothole', label: 'Pothole', icon: '🕳️' },
  { key: 'road_damage', label: 'Road Damage', icon: '🚧' },
  { key: 'waterlogging', label: 'Waterlogging', icon: '💧' },
  { key: 'garbage', label: 'Garbage', icon: '🗑️' },
  { key: 'streetlight', label: 'Streetlight', icon: '💡' },
  { key: 'water_supply', label: 'Water Supply', icon: '🚰' },
  { key: 'sewage', label: 'Sewage', icon: '🚿' },
  { key: 'encroachment', label: 'Encroachment', icon: '🏗️' },
  { key: 'tree_hazard', label: 'Tree Hazard', icon: '🌳' },
  { key: 'safety', label: 'Safety', icon: '🚨' },
  { key: 'noise_pollution', label: 'Noise', icon: '🔊' },
  { key: 'air_pollution', label: 'Air Pollution', icon: '🌫️' },
  { key: 'park_damage', label: 'Park Damage', icon: '🏞️' },
  { key: 'stray_animals', label: 'Stray Animals', icon: '🐕' },
  { key: 'other', label: 'Other', icon: '📋' },
];

export default function ReportScreen() {
  const { t } = useTranslation();
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [isSOS, setIsSOS] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
      }
    })();
  }, []);

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      videoMaxDuration: 30,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' });
    }
  };

  const pickFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' });
    }
  };

  const getLocation = async () => {
    try {
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    } catch (e) {
      Alert.alert("Could not fetch location");
    }
  };

  const submitReport = async () => {
    if (!category) {
      Alert.alert('Missing Category', 'Please select an issue category.');
      return;
    }
    if (!description.trim() && !title.trim()) {
      Alert.alert('Missing Description', 'Please describe the issue.');
      return;
    }
    if (!location) {
      Alert.alert('Missing Location', 'Please tag your current location.');
      return;
    }

    setSubmitting(true);
    try {
      let mediaUrls: string[] = [];
      if (media) {
        const formData = new FormData();
        const filename = media.uri.split('/').pop() || (media.type === 'video' ? 'video.mp4' : 'photo.jpg');
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        let mimeType = 'image/jpeg';
        if (media.type === 'video') {
          mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
        } else if (ext === 'png') {
          mimeType = 'image/png';
        }
        formData.append('file', { uri: media.uri, name: filename, type: mimeType } as any);
        try {
          const uploadRes = await apiClient.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (uploadRes.data?.data?.url) {
            mediaUrls = [uploadRes.data.data.url];
          }
        } catch {
          mediaUrls = [];
        }
      }

      const backendPayload = {
        category,
        description: description.trim() || title.trim(),
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        media_urls: mediaUrls,
        is_sos: isSOS,
      };

      const res = await apiClient.post('/reports', backendPayload);

      setSubmitted(true);
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setMedia(null);
        setLocation(null);
        setIsSOS(false);
        setCategory(null);
        setSubmitted(false);
      }, 3000);
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to submit report';
      Alert.alert('Submission Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View className="flex-1 bg-[#F5F7FA] items-center justify-center px-8">
        <View
          className="bg-white p-10 rounded-[36px] items-center"
          style={{
            elevation: 12,
            shadowColor: '#16A34A',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
          }}
        >
          <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-5 border-2 border-green-100">
            <CheckCircle color="#16A34A" size={48} />
          </View>
          <Text className="text-2xl font-black text-gray-900 text-center">Report Submitted!</Text>
          <Text className="text-gray-500 font-medium text-center mt-3 leading-relaxed text-sm">
            {isSOS ? 'Emergency services have been notified.' : 'Your report is being processed by AI and will be clustered with related issues.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]">
      {/* Curved Header */}
      <View
        className={`pt-16 pb-12 px-6 ${isSOS ? 'bg-red-500' : 'bg-brand-orange'}`}
        style={{
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          shadowColor: isSOS ? '#DC2626' : '#FF7E67',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <Text className="text-3xl font-black text-white tracking-tight">New Report</Text>
        <Text className="text-white/70 font-semibold text-sm mt-1">Help improve your city by reporting issues</Text>

        {/* SOS Toggle inside header */}
        <View className="flex-row items-center mt-5 bg-white/15 p-3 rounded-2xl">
          <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
            <AlertTriangle color="white" size={20} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-sm">SOS Emergency</Text>
            <Text className="text-white/60 text-xs font-medium">Bypass AI for immediate attention</Text>
          </View>
          <Switch
            value={isSOS}
            onValueChange={setIsSOS}
            trackColor={{ false: "rgba(255,255,255,0.3)", true: "#FCA5A5" }}
            thumbColor={isSOS ? "#DC2626" : "#FFFFFF"}
          />
        </View>
      </View>

      {/* Media Picker - Overlapping the header curve */}
      <View className="px-5" style={{ marginTop: -20 }}>
        {media ? (
          <TouchableOpacity
            onPress={takePhoto}
            className="w-full h-52 bg-white rounded-[28px] overflow-hidden"
            style={{
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 14,
            }}
          >
            {media.type === 'video' ? (
              <View className="flex-1 bg-gray-900 items-center justify-center rounded-[28px]">
                <Video color="white" size={44} />
                <Text className="text-white font-bold mt-2">Video Selected</Text>
                <Text className="text-gray-400 text-xs mt-1">Tap to change</Text>
              </View>
            ) : (
              <Image source={{ uri: media.uri }} className="w-full h-full" style={{ borderRadius: 28 }} />
            )}
          </TouchableOpacity>
        ) : (
          <View className="flex-row">
            <TouchableOpacity
              onPress={takePhoto}
              className="flex-1 h-36 bg-white rounded-[24px] mr-2 items-center justify-center"
              style={{
                elevation: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 10,
                borderWidth: 2,
                borderColor: '#F1F5F9',
                borderStyle: 'dashed',
              }}
            >
              <View className="w-14 h-14 rounded-2xl bg-orange-50 items-center justify-center mb-2">
                <Camera color="#FF7E67" size={28} />
              </View>
              <Text className="text-gray-700 font-bold text-sm">Camera</Text>
              <Text className="text-gray-400 text-xs font-medium">Photo or Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickFromGallery}
              className="flex-1 h-36 bg-white rounded-[24px] ml-2 items-center justify-center"
              style={{
                elevation: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 10,
                borderWidth: 2,
                borderColor: '#F1F5F9',
                borderStyle: 'dashed',
              }}
            >
              <View className="w-14 h-14 rounded-2xl bg-purple-50 items-center justify-center mb-2">
                <LucideImage color="#8B5CF6" size={28} />
              </View>
              <Text className="text-gray-700 font-bold text-sm">Gallery</Text>
              <Text className="text-gray-400 text-xs font-medium">Pick existing</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Location Button */}
      <TouchableOpacity
        onPress={getLocation}
        className="mx-5 mt-5"
        activeOpacity={0.85}
      >
        <View
          className={`flex-row items-center p-4 rounded-[22px] ${location ? 'bg-green-50' : 'bg-white'}`}
          style={{
            elevation: 4,
            shadowColor: location ? '#16A34A' : '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            borderWidth: 1.5,
            borderColor: location ? '#BBF7D0' : '#F1F5F9',
          }}
        >
          <View className={`w-11 h-11 rounded-2xl items-center justify-center ${location ? 'bg-green-100' : 'bg-orange-50'}`}>
            {location ? <Navigation color="#16A34A" size={20} /> : <MapPin color="#FF7E67" size={20} />}
          </View>
          <View className="ml-3 flex-1">
            <Text className={`font-bold text-sm ${location ? 'text-green-800' : 'text-gray-700'}`}>
              {location ? 'Location Tagged' : 'Tag Current Location'}
            </Text>
            {location && (
              <Text className="text-green-600 text-xs font-medium mt-0.5">
                {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
              </Text>
            )}
          </View>
          {location && <CheckCircle size={20} color="#16A34A" />}
        </View>
      </TouchableOpacity>

      {/* Category Picker */}
      <View className="px-5 mt-6">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">What's the issue?</Text>
        <View className="flex-row flex-wrap">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setCategory(cat.key)}
              className={`mr-2 mb-2.5 px-4 py-2.5 rounded-2xl ${category === cat.key ? 'bg-brand-orange' : 'bg-white'}`}
              style={category === cat.key ? {
                elevation: 4,
                shadowColor: '#FF7E67',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
              } : {
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                borderWidth: 1,
                borderColor: '#F1F5F9',
              }}
            >
              <Text className={`font-bold text-sm ${category === cat.key ? 'text-white' : 'text-gray-700'}`}>
                {cat.icon} {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Form Fields */}
      <View
        className="mx-5 mt-6 bg-white p-6 rounded-[28px]"
        style={{
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        }}
      >
        <TextInput
          placeholder="Issue Title (e.g., Pothole on Main St)"
          value={title}
          onChangeText={setTitle}
          className="border-b border-gray-100 pb-4 mb-5 font-black text-gray-900 text-lg"
          placeholderTextColor="#94A3B8"
        />
        <TextInput
          placeholder="Detailed description of the issue..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          className="text-gray-700 h-28 font-medium text-base leading-relaxed"
          textAlignVertical="top"
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Submit Button */}
      <View className="px-5 mt-6 mb-32">
        <TouchableOpacity
          onPress={submitReport}
          disabled={submitting}
          className={`${isSOS ? 'bg-red-600' : 'bg-brand-orange'} ${submitting ? 'opacity-70' : ''} p-5 rounded-[22px] flex-row items-center justify-center`}
          style={{
            elevation: 8,
            shadowColor: isSOS ? '#DC2626' : '#FF7E67',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Send color="white" size={22} />
          )}
          <Text className="text-white font-black text-lg ml-3 tracking-wide">
            {submitting ? 'Submitting...' : isSOS ? 'Submit SOS' : 'Submit Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
