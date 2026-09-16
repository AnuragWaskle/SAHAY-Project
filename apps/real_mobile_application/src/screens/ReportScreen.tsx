import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import {
  Camera,
  MapPin,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  Navigation,
  Edit3,
  ChevronDown,
  Check,
  X,
  Maximize2
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import apiClient from '../api/client';

export default function ReportScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads');
  const [customCategory, setCustomCategory] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  
  // Location states
  const [locationAddress, setLocationAddress] = useState('Fetching live location...');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 23.259933,
    longitude: 77.412613,
  });
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [fullMapModalOpen, setFullMapModalOpen] = useState(false);

  // Media state (camera capture only)
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { name: 'Roads', icon: '🛣️' },
    { name: 'Power & Lights', icon: '⚡' },
    { name: 'Water & Drainage', icon: '🚰' },
    { name: 'Sanitation', icon: '🧹' },
    { name: 'Safety', icon: '🛡️' },
    { name: 'Environment', icon: '🌿' },
    { name: 'Other', icon: '📝' }
  ];

  // Reverse geocode helper with multi-tier fallbacks
  const updateAddressForCoords = async (latitude: number, longitude: number) => {
    // Tier 1: Expo native reverse geocode
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const formatted = [
          place.name || place.streetNumber,
          place.street || place.district || place.subregion,
          place.city || place.region || 'Bhopal'
        ].filter(Boolean).join(', ');
        if (formatted && formatted.length > 3) {
          setLocationAddress(formatted);
          return;
        }
      }
    } catch (e) {
      console.warn('Expo reverse geocode warning:', e);
    }

    // Tier 2: OpenStreetMap Nominatim API reverse geocode
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'SahayApp/1.0' } }
      );
      const data = await resp.json();
      if (data?.display_name) {
        const parts = data.display_name.split(',');
        const shortAddr = parts.slice(0, 3).join(',').trim();
        setLocationAddress(shortAddr || data.display_name);
        return;
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode error:', err);
    }

    // Tier 3: Clean neighborhood fallback
    setLocationAddress(`Ward 12, MP Nagar, Bhopal (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
  };

  // 1. Auto-fetch Live Location on Mount with explicit permission handling
  const fetchLiveLocation = async () => {
    setFetchingLocation(true);
    setLocationAddress('Fetching live GPS location...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Access Required',
          'Sahay requires location permissions to pinpoint the civic issue on Google Maps for municipal repair teams.',
          [{ text: 'OK' }]
        );
        setLocationAddress('Location Permission Denied');
        setFetchingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCoords(newCoords);
      await updateAddressForCoords(newCoords.latitude, newCoords.longitude);
    } catch (error) {
      console.warn('Location fetch error:', error);
      try {
        const lastLoc = await Location.getLastKnownPositionAsync();
        if (lastLoc) {
          const newCoords = {
            latitude: lastLoc.coords.latitude,
            longitude: lastLoc.coords.longitude,
          };
          setCoords(newCoords);
          await updateAddressForCoords(newCoords.latitude, newCoords.longitude);
          return;
        }
      } catch (e2) {
        console.warn('Last known position error:', e2);
      }
      const defaultCoords = { latitude: 23.259933, longitude: 77.412613 };
      setCoords(defaultCoords);
      updateAddressForCoords(defaultCoords.latitude, defaultCoords.longitude);
    } finally {
      setFetchingLocation(false);
    }
  };

  useEffect(() => {
    fetchLiveLocation();
  }, []);

  // Map press handler to let citizens adjust pin
  const handleMapPress = (e: any) => {
    const newPoint = e.nativeEvent.coordinate;
    setCoords(newPoint);
    updateAddressForCoords(newPoint.latitude, newPoint.longitude);
  };

  // 2. Take Picture using Mobile Camera ONLY (No Gallery)
  const handleCameraCapture = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission Required', 'Please allow camera access to take live proof photos of civic issues.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Camera launch error:', err);
      Alert.alert('Camera Error', 'Could not open camera module.');
    }
  };

  // 3. Form Submission to Backend API
  const handleSubmit = async () => {
    const finalCategory = category === 'Other' ? (customCategory.trim() || 'General Issue') : category;

    if (!imageUri) {
      Alert.alert(
        'Photo Evidence Required 📸',
        'A camera photo of the civic issue is mandatory for AI verification and processing. Please tap "Take Photo with Camera" to capture visual proof.'
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for the civic issue.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please provide a detailed description of the issue.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/reports', {
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        address: locationAddress,
        lat: coords.latitude,
        lng: coords.longitude,
        latitude: coords.latitude,
        longitude: coords.longitude,
        media_urls: imageUri ? [imageUri] : [],
      });

      Alert.alert(
        'Report Submitted Successfully ✓',
        `Your civic issue under "${finalCategory}" is now live and dispatched to city officials.`,
        [
          {
            text: 'View Profile Reports',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            text: 'View Community Feed',
            onPress: () => navigation.navigate('Feed'),
          }
        ]
      );
    } catch (e: any) {
      console.warn('Submit error:', e);
      Alert.alert('Submission Failed', e.response?.data?.error || 'Unable to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
        >
          <ArrowLeft size={20} color="#0B1C30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Civic Issue</Text>
        <View style={styles.aiBadge}>
          <Sparkles size={12} color="#0051D5" />
          <Text style={styles.aiBadgeText}>AI Assist</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Live Camera Capture Box */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>1. Camera Evidence</Text>
          <Text style={styles.sectionSubtitle}>Live mobile camera photo required</Text>
        </View>

        <TouchableOpacity 
          activeOpacity={0.9} 
          style={styles.cameraBox} 
          onPress={handleCameraCapture}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.emptyCameraContent}>
              <View style={styles.cameraIconCircle}>
                <Camera size={28} color="#0051D5" />
              </View>
              <Text style={styles.cameraPromptMain}>Tap to Open Camera</Text>
              <Text style={styles.cameraPromptSub}>Direct mobile camera capture</Text>
            </View>
          )}

          {/* AI Scanner Overlay */}
          <View style={styles.aiDetectionBar}>
            <View style={styles.aiTagPill}>
              <Sparkles size={13} color="#FFFFFF" />
              <Text style={styles.aiTagText}>Sahay AI: Live Issue Scanner Active</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.retakeFloatingBtn} onPress={handleCameraCapture}>
            <Camera size={16} color="#FFFFFF" />
            <Text style={styles.retakeBtnText}>{imageUri ? 'Retake Photo' : 'Take Photo'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Automatic Live Location & Interactive Map Card */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>2. Live GPS & Location Map</Text>
          <Text style={styles.sectionSubtitle}>Auto-captured via GPS • Tap map or button to adjust pin position</Text>
        </View>

        <View style={styles.mapCard}>
          <TouchableOpacity activeOpacity={0.9} style={styles.mapWrapper} onPress={() => setFullMapModalOpen(true)}>
            <MapView
              style={styles.miniMap}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              region={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              onPress={handleMapPress}
            >
              <Marker
                coordinate={coords}
                title="Issue Location"
                description={locationAddress}
                draggable
                onDragEnd={(e) => {
                  const pt = e.nativeEvent.coordinate;
                  setCoords(pt);
                  updateAddressForCoords(pt.latitude, pt.longitude);
                }}
              />
            </MapView>
            
            <TouchableOpacity style={styles.mapOverlayBadge} onPress={() => setFullMapModalOpen(true)}>
              <Maximize2 size={12} color="#FFFFFF" />
              <Text style={styles.mapOverlayText}>Open Full Interactive Map ↗</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Address Text Box */}
          <View style={styles.locationDetailRow}>
            <View style={styles.locationIconWrap}>
              <MapPin size={20} color="#D32F2F" />
            </View>

            <View style={styles.locationTextContainer}>
              <View style={styles.gpsStatusRow}>
                <View style={styles.greenDot} />
                <Text style={styles.gpsStatusText}>GPS LIVE</Text>
                <Text style={styles.coordsText}>
                  ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})
                </Text>
              </View>

              <TextInput
                style={styles.locationAddressInput}
                value={locationAddress}
                onChangeText={setLocationAddress}
                multiline
              />
            </View>

            <TouchableOpacity 
              style={styles.refreshLocBtn} 
              onPress={fetchLiveLocation}
              disabled={fetchingLocation}
            >
              {fetchingLocation ? (
                <ActivityIndicator size="small" color="#0051D5" />
              ) : (
                <RefreshCw size={16} color="#0051D5" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Dropdown Category Selector */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>3. Select Category</Text>
          <Text style={styles.sectionSubtitle}>Choose the category that best describes this issue</Text>
        </View>

        <TouchableOpacity 
          style={styles.categoryDropdownTrigger}
          onPress={() => setCategoryDropdownOpen(true)}
        >
          <View style={styles.dropdownLeft}>
            <Text style={styles.dropdownSelectedIcon}>
              {categories.find(c => c.name === category)?.icon || '📝'}
            </Text>
            <Text style={styles.dropdownSelectedLabel}>{category}</Text>
          </View>
          <View style={styles.dropdownRightPill}>
            <Text style={styles.dropdownSelectText}>Change</Text>
            <ChevronDown size={18} color="#0051D5" />
          </View>
        </TouchableOpacity>

        {/* Manual Category Input if "Other" is chosen */}
        {category === 'Other' && (
          <View style={styles.customCategoryCard}>
            <Edit3 size={16} color="#0051D5" />
            <TextInput
              style={styles.customCategoryInput}
              placeholder="Type your custom problem category (e.g. Illegal Dumping)..."
              placeholderTextColor="#8C9BAC"
              value={customCategory}
              onChangeText={setCustomCategory}
            />
          </View>
        )}

        {/* Issue Title Input */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>4. Issue Title</Text>
        </View>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.textInputMain}
            placeholder="e.g. Deep dangerous pothole on Main Market Road"
            placeholderTextColor="#8C9BAC"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Detailed Description Input */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>5. Detailed Description</Text>
        </View>

        <View style={[styles.inputCard, styles.inputCardLarge]}>
          <TextInput
            style={[styles.textInputMain, styles.textAreaMain]}
            placeholder="Describe the exact issue, hazard level, duration, and details for quick resolution..."
            placeholderTextColor="#8C9BAC"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Submit Action Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <CheckCircle2 size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Civic Incident ✓</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footerNote}>
          <ShieldAlert size={14} color="#6C7A89" />
          <Text style={styles.footerNoteText}>
            Verified reports are automatically routed to local ward engineers and municipal officers.
          </Text>
        </View>

      </ScrollView>

      {/* Category Dropdown Picker Modal */}
      <Modal visible={categoryDropdownOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Incident Category</Text>
              <TouchableOpacity onPress={() => setCategoryDropdownOpen(false)}>
                <X size={20} color="#00152A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionActive]}
                    onPress={() => {
                      setCategory(cat.name);
                      setCategoryDropdownOpen(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.dropdownOptionIcon}>{cat.icon}</Text>
                      <Text style={[styles.dropdownOptionLabel, isSelected && styles.dropdownOptionLabelActive]}>
                        {cat.name}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color="#0051D5" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Screen Interactive Map Modal */}
      <Modal visible={fullMapModalOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.fullMapHeader}>
            <TouchableOpacity onPress={() => setFullMapModalOpen(false)}>
              <ArrowLeft size={22} color="#0B1C30" />
            </TouchableOpacity>
            <Text style={styles.fullMapTitle}>Adjust Issue Pin Location</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setFullMapModalOpen(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <MapView
              style={{ flex: 1 }}
              region={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              onPress={handleMapPress}
            >
              <Marker
                coordinate={coords}
                title="Issue Pin Location"
                description={locationAddress}
                draggable
                onDragEnd={(e) => {
                  const pt = e.nativeEvent.coordinate;
                  setCoords(pt);
                  updateAddressForCoords(pt.latitude, pt.longitude);
                }}
              />
            </MapView>

            <View style={styles.fullMapFooterPill}>
              <MapPin size={20} color="#D32F2F" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.fullMapAddressTitle}>Selected Address</Text>
                <Text style={styles.fullMapAddressSub} numberOfLines={1}>{locationAddress}</Text>
              </View>
              <TouchableOpacity style={styles.confirmPinBtn} onPress={() => setFullMapModalOpen(false)}>
                <Check size={16} color="#FFF" />
                <Text style={styles.confirmPinText}>Confirm Pin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
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
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8FF',
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: -0.2,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: -0.1,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  cameraBox: {
    height: 200,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyCameraContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cameraIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cameraPromptMain: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cameraPromptSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  aiDetectionBar: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  aiTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.90)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aiTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  retakeFloatingBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  mapWrapper: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  mapOverlayBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  mapOverlayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  locationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationTextContainer: {
    flex: 1,
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  gpsStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    textTransform: 'uppercase',
  },
  coordsText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  locationAddressInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B4B',
    padding: 0,
  },
  refreshLocBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    marginLeft: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  categoryChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  categoryChipIcon: {
    fontSize: 13,
  },
  categoryChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  categoryChipLabelActive: {
    color: '#FFFFFF',
  },
  customCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  customCategoryInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B4B',
    padding: 0,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    position: 'relative',
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  inputCardLarge: {
    minHeight: 110,
  },
  textInputMain: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1B4B',
    padding: 0,
  },
  textAreaMain: {
    textAlignVertical: 'top',
    height: 80,
  },
  charCount: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 14,
    elevation: 4,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },
  categoryDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownSelectedIcon: {
    fontSize: 22,
  },
  dropdownSelectedLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  dropdownRightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dropdownSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F6FF',
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
    backgroundColor: '#FAF8FE',
  },
  dropdownOptionActive: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  dropdownOptionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  dropdownOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1B4B',
  },
  dropdownOptionLabelActive: {
    fontWeight: '800',
    color: '#7C3AED',
  },
  fullMapHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F6FF',
  },
  fullMapTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  doneBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  fullMapFooterPill: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  fullMapAddressTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  fullMapAddressSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B4B',
    marginTop: 2,
  },
  confirmPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  confirmPinText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
