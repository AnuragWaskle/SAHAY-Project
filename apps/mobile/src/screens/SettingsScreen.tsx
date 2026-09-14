import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, Globe, Bell, Lock, Eye, MapPin, HelpCircle, FileText, Trash2, LogOut, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { logout } = useContext(AuthContext);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState('public');
  const [notificationPref, setNotificationPref] = useState('instant');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/users/me');
        const data = res.data.data;
        setProfile(data);
        setName(data.name || '');
        setBio(data.bio || '');
        setPrivacyLevel(data.privacy_level || 'public');
        setNotificationPref(data.notification_pref || 'instant');
        setLanguage(data.language_pref || 'en');
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/users/me', {
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        privacy_level: privacyLevel,
        notification_pref: notificationPref,
        language_pref: language,
      });
      i18n.changeLanguage(language);
      Alert.alert('Saved', 'Your settings have been updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently removed. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Contact Support', 'Please email support@sahay.app to request account deletion.') },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#FF7E67" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]">
      {/* Header */}
      <View
        className="bg-brand-orange pt-14 pb-8 px-6"
        style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text className="text-2xl font-black text-white">Settings</Text>
        <Text className="text-white/70 font-medium text-sm mt-1">Manage your account & preferences</Text>
      </View>

      {/* Account Section */}
      <View className="px-5 mt-6">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Account</Text>
        <View
          className="bg-white p-5 rounded-[24px]"
          style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 }}
        >
          <Text className="text-xs font-bold text-gray-400 mb-1">Display Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            className="bg-gray-50 px-4 py-3 rounded-xl font-bold text-gray-800 border border-gray-100 mb-4"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-xs font-bold text-gray-400 mb-1">Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself..."
            multiline
            numberOfLines={3}
            className="bg-gray-50 px-4 py-3 rounded-xl font-medium text-gray-800 border border-gray-100 h-20"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Privacy Section */}
      <View className="px-5 mt-6">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Privacy</Text>
        <View
          className="bg-white p-5 rounded-[24px]"
          style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 }}
        >
          <View className="flex-row items-center mb-2">
            <Eye size={18} color="#6B7280" />
            <Text className="font-bold text-gray-700 ml-3 text-sm">Profile Visibility</Text>
          </View>
          <View className="flex-row mt-2">
            {(['public', 'semi_private', 'private'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setPrivacyLevel(level)}
                className={`flex-1 py-2.5 rounded-xl items-center mx-1 ${privacyLevel === level ? 'bg-brand-orange' : 'bg-gray-50 border border-gray-100'}`}
              >
                <Text className={`text-xs font-bold ${privacyLevel === level ? 'text-white' : 'text-gray-600'}`}>
                  {level === 'semi_private' ? 'Semi' : level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Notifications Section */}
      <View className="px-5 mt-6">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Notifications</Text>
        <View
          className="bg-white p-5 rounded-[24px]"
          style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 }}
        >
          <View className="flex-row items-center mb-2">
            <Bell size={18} color="#6B7280" />
            <Text className="font-bold text-gray-700 ml-3 text-sm">Notification Frequency</Text>
          </View>
          <View className="flex-row mt-2">
            {(['instant', 'daily', 'weekly'] as const).map((pref) => (
              <TouchableOpacity
                key={pref}
                onPress={() => setNotificationPref(pref)}
                className={`flex-1 py-2.5 rounded-xl items-center mx-1 ${notificationPref === pref ? 'bg-brand-orange' : 'bg-gray-50 border border-gray-100'}`}
              >
                <Text className={`text-xs font-bold ${notificationPref === pref ? 'text-white' : 'text-gray-600'}`}>
                  {pref.charAt(0).toUpperCase() + pref.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Language Section */}
      <View className="px-5 mt-6">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Language</Text>
        <View
          className="bg-white p-5 rounded-[24px]"
          style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 }}
        >
          <View className="flex-row items-center mb-2">
            <Globe size={18} color="#6B7280" />
            <Text className="font-bold text-gray-700 ml-3 text-sm">App Language</Text>
          </View>
          <View className="flex-row mt-2">
            <TouchableOpacity
              onPress={() => setLanguage('en')}
              className={`flex-1 py-3 rounded-xl items-center mr-2 ${language === 'en' ? 'bg-brand-orange' : 'bg-gray-50 border border-gray-100'}`}
            >
              <Text className={`font-bold ${language === 'en' ? 'text-white' : 'text-gray-600'}`}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLanguage('hi')}
              className={`flex-1 py-3 rounded-xl items-center ml-2 ${language === 'hi' ? 'bg-brand-orange' : 'bg-gray-50 border border-gray-100'}`}
            >
              <Text className={`font-bold ${language === 'hi' ? 'text-white' : 'text-gray-600'}`}>हिंदी</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <View className="px-5 mt-6">
        <TouchableOpacity
          onPress={saveSettings}
          disabled={saving}
          className="bg-brand-orange py-4 rounded-[20px] items-center flex-row justify-center"
          style={{ elevation: 6, shadowColor: '#FF7E67', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Check size={20} color="#FFF" />
          )}
          <Text className="text-white font-black text-base ml-2">{saving ? 'Saving...' : 'Save Settings'}</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View className="px-5 mt-8 mb-32">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Danger Zone</Text>
        <View
          className="bg-white rounded-[24px] overflow-hidden"
          style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 }}
        >
          <TouchableOpacity onPress={logout} className="flex-row items-center p-5 border-b border-gray-50">
            <View className="w-10 h-10 rounded-2xl bg-red-50 items-center justify-center">
              <LogOut size={18} color="#EF4444" />
            </View>
            <Text className="font-bold text-red-600 ml-4 flex-1">Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteAccount} className="flex-row items-center p-5">
            <View className="w-10 h-10 rounded-2xl bg-red-50 items-center justify-center">
              <Trash2 size={18} color="#EF4444" />
            </View>
            <Text className="font-bold text-red-600 ml-4 flex-1">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
