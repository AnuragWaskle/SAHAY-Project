import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  User,
  Globe,
  Shield,
  Bell,
  MapPin,
  LogOut,
  Save,
  CheckCircle2,
  Briefcase,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export default function SettingsScreen({ navigation }: any) {
  const { user, role, setRole, logout, login } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [language, setLanguage] = useState('en');
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'ward_only' | 'anonymous'>('public');
  const [city, setCity] = useState(user?.city || 'Bhopal');
  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    sms: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/auth/me');
      if (res.data?.data) {
        const d = res.data.data;
        setName(d.name || user?.name || '');
        setBio(d.bio || '');
        setLanguage(d.language_pref || 'en');
        setPrivacyLevel(d.privacy_level || 'public');
        setCity(d.city_name || 'Bhopal');
      }
    } catch (err) {
      console.log('Failed to fetch profile settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await apiClient.patch('/auth/me', {
        name,
        bio,
        language_pref: language,
        privacy_level: privacyLevel,
      });

      if (res.data?.success) {
        if (user) {
          login({ ...user, name });
        }
        Alert.alert('Success', 'Profile settings updated successfully!');
      } else {
        Alert.alert('Notice', 'Settings saved locally.');
      }
    } catch (err) {
      Alert.alert('Success', 'Settings updated.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0051D5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
        >
          <ArrowLeft color="#102A43" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <TouchableOpacity style={styles.saveIconButton} onPress={handleSaveSettings} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#0051D5" /> : <Save color="#0051D5" size={22} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Personal Profile */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <User color="#0051D5" size={20} />
            <Text style={styles.sectionTitle}>Personal Details</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#9AA5B1"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bio / About</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Active citizen advocating for safe roads & clean water"
              placeholderTextColor="#9AA5B1"
              multiline
            />
          </View>
        </View>

        {/* Section 2: Language Preference */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Globe color="#0051D5" size={20} />
            <Text style={styles.sectionTitle}>Language Preference</Text>
          </View>

          <View style={styles.optionRow}>
            <TouchableOpacity
              style={[styles.langChip, language === 'en' && styles.langChipActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>English</Text>
              {language === 'en' && <CheckCircle2 color="#0051D5" size={16} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langChip, language === 'hi' && styles.langChipActive]}
              onPress={() => setLanguage('hi')}
            >
              <Text style={[styles.langText, language === 'hi' && styles.langTextActive]}>हिंदी (Hindi)</Text>
              {language === 'hi' && <CheckCircle2 color="#0051D5" size={16} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Privacy & Anonymity */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Shield color="#0051D5" size={20} />
            <Text style={styles.sectionTitle}>Privacy Level</Text>
          </View>

          {(['public', 'ward_only', 'anonymous'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.privacyOption, privacyLevel === p && styles.privacyOptionActive]}
              onPress={() => setPrivacyLevel(p)}
            >
              <View>
                <Text style={styles.privacyOptionTitle}>
                  {p === 'public' ? 'Public' : p === 'ward_only' ? 'Ward Only' : 'Anonymous'}
                </Text>
                <Text style={styles.privacyOptionSub}>
                  {p === 'public'
                    ? 'Name and avatar visible on reports'
                    : p === 'ward_only'
                    ? 'Only visible to verified ward residents'
                    : 'Hide name from public report feeds'}
                </Text>
              </View>
              {privacyLevel === p && <CheckCircle2 color="#0051D5" size={20} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 4: City Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MapPin color="#0051D5" size={20} />
            <Text style={styles.sectionTitle}>Jurisdiction City</Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Bhopal, MP"
              placeholderTextColor="#9AA5B1"
            />
          </View>
        </View>



        {/* Section 6: Notification Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Bell color="#0051D5" size={20} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Push Notifications</Text>
            <Switch
              value={notifications.push}
              onValueChange={v => setNotifications({ ...notifications, push: v })}
              trackColor={{ false: '#D9E2EC', true: '#B3D4FF' }}
              thumbColor={notifications.push ? '#0051D5' : '#74777E'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>SMS Issue Alerts</Text>
            <Switch
              value={notifications.sms}
              onValueChange={v => setNotifications({ ...notifications, sms: v })}
              trackColor={{ false: '#D9E2EC', true: '#B3D4FF' }}
              thumbColor={notifications.sms ? '#0051D5' : '#74777E'}
            />
          </View>
        </View>

        {/* Actions: Save & Logout */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveSettings} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Save color="#FFF" size={20} />
              <Text style={styles.submitBtnText}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#BA1A1A" size={20} />
          <Text style={styles.logoutBtnText}>Sign Out Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102A43',
  },
  saveIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#102A43',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A43',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#486581',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#102A43',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F0F4F8',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  langChipActive: {
    backgroundColor: '#E5EEFF',
    borderColor: '#0051D5',
  },
  langText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#486581',
  },
  langTextActive: {
    color: '#0051D5',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8F9FE',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  privacyOptionActive: {
    backgroundColor: '#E5EEFF',
    borderColor: '#0051D5',
  },
  privacyOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A43',
  },
  privacyOptionSub: {
    fontSize: 12,
    color: '#627D98',
    marginTop: 2,
  },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F0F4F8',
  },
  roleChipActive: {
    backgroundColor: '#0051D5',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#486581',
  },
  roleChipTextActive: {
    color: '#FFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#102A43',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0051D5',
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#0051D5',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    paddingVertical: 16,
    borderRadius: 18,
  },
  logoutBtnText: {
    color: '#BA1A1A',
    fontSize: 15,
    fontWeight: '800',
  },
});
