import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import {
  Camera,
  Image as ImageIcon,
  Video,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react-native';
import apiClient from '../api/client';

export default function ReportScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads');
  const [location, setLocation] = useState('Main Market Road, Ward 12, Bhopal');
  const [imageUri, setImageUri] = useState<string | null>(
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80'
  );
  const [submitting, setSubmitting] = useState(false);

  const categories = ['Roads', 'Sanitation', 'Power', 'Water', 'Safety'];

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Fields', 'Please fill in both the issue title and description.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/incidents', {
        title,
        description,
        category,
        location_address: location,
        media_urls: imageUri ? [imageUri] : [],
        latitude: 23.259933,
        longitude: 77.412613,
      });

      Alert.alert(
        'Report Submitted ✓',
        'Your civic issue is now live and visible to the community.',
        [
          {
            text: 'View Feed',
            onPress: () => navigation.navigate('Feed'),
          },
        ]
      );
    } catch (e) {
      console.warn('Submit error:', e);
      Alert.alert('Submission Error', 'Failed to submit report. Please check your backend connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#00152A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Issue Camera</Text>
        <View style={styles.aiLiveBadge}>
          <Sparkles size={12} color="#0051D5" />
          <Text style={styles.aiLiveText}>AI Ready</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* AI Camera Viewfinder Box */}
        <View style={styles.viewfinderBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.emptyCameraView}>
              <Camera size={40} color="#74777E" />
              <Text style={styles.cameraPromptText}>Tap to capture or upload photo/video</Text>
            </View>
          )}

          {/* AI Detection Overlay */}
          <View style={styles.aiDetectionOverlay}>
            <View style={styles.aiTagPill}>
              <Sparkles size={12} color="#FFF" />
              <Text style={styles.aiTagText}>Sahay AI: Pothole Detected (96% Match)</Text>
            </View>
          </View>
        </View>

        {/* Media Option Bar */}
        <View style={styles.mediaOptionRow}>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => setImageUri('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600')}>
            <Camera size={18} color="#0051D5" />
            <Text style={styles.mediaBtnText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mediaBtn} onPress={() => setImageUri('https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600')}>
            <ImageIcon size={18} color="#0051D5" />
            <Text style={styles.mediaBtnText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mediaBtn}>
            <Video size={18} color="#0051D5" />
            <Text style={styles.mediaBtnText}>Video Proof</Text>
          </TouchableOpacity>
        </View>

        {/* Category Selector */}
        <Text style={styles.labelTitle}>Select Category</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryPillText, category === cat && styles.categoryPillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title Input */}
        <Text style={styles.labelTitle}>Issue Title</Text>
        <TextInput
          style={styles.inputField}
          placeholder="e.g. Dangerous pothole near SBI ATM"
          placeholderTextColor="#74777E"
          value={title}
          onChangeText={setTitle}
        />

        {/* Description Input */}
        <Text style={styles.labelTitle}>Detailed Description</Text>
        <TextInput
          style={[styles.inputField, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Describe the issue and how it impacts citizens..."
          placeholderTextColor="#74777E"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {/* Location Picker Tag */}
        <Text style={styles.labelTitle}>Location</Text>
        <View style={styles.locationBox}>
          <MapPin size={18} color="#BA1A1A" />
          <TextInput
            style={styles.locationInput}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Submit Action Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Submit Report ✓</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    height: 60,
    backgroundColor: '#F8F9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EEFF',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00152A',
  },
  aiLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0051D5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  viewfinderBox: {
    height: 220,
    backgroundColor: '#102A43',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  emptyCameraView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraPromptText: {
    color: '#74777E',
    fontSize: 12,
  },
  aiDetectionOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  aiTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0051D5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  aiTagText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  mediaOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  mediaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0051D5',
  },
  labelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00152A',
    marginBottom: 6,
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EFF4FF',
  },
  categoryPillActive: {
    backgroundColor: '#00152A',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B1C30',
  },
  categoryPillTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0B1C30',
    borderWidth: 1,
    borderColor: '#E5EEFF',
    marginBottom: 12,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5EEFF',
    marginBottom: 20,
  },
  locationInput: {
    flex: 1,
    fontSize: 13,
    color: '#0B1C30',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0051D5',
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: '#0051D5',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
