import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  ShieldCheck,
  Award,
  MapPin,
  FileText,
  Settings,
  LogOut,
  Bookmark,
  Sparkles,
  Trash2,
  Camera,
  Mail,
  Phone,
  CheckCircle2,
  Zap,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'my_reports' | 'saved_posts' | 'badges'>('my_reports');
  const [userReports, setUserReports] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/users/me');
      setProfile(res.data.data);
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }
  };

  const fetchUserReports = async () => {
    try {
      const res = await apiClient.get('/reports/mine');
      const items = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data?.data : []);
      setUserReports(items);
    } catch (e) {
      console.warn('My reports fetch error:', e);
      setUserReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSavedPosts = async () => {
    try {
      const raw = await AsyncStorage.getItem('@saved_posts');
      if (raw) {
        setSavedPosts(JSON.parse(raw));
      } else {
        setSavedPosts([]);
      }
    } catch (e) {
      console.warn('Saved posts error:', e);
    }
  };

  const loadAvatar = async () => {
    try {
      const savedAvatar = await AsyncStorage.getItem('@user_avatar');
      if (savedAvatar) setCustomAvatar(savedAvatar);
    } catch (e) {
      console.warn('Load avatar error:', e);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchUserReports();
    fetchSavedPosts();
    loadAvatar();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchUserReports();
    fetchSavedPosts();
    loadAvatar();
  };

  const persistAvatarToServer = async (uri: string) => {
    try {
      await apiClient.patch('/users/me', { avatar_url: uri });
    } catch (e) {
      console.warn('Avatar sync to server failed (saved locally):', e);
    }
  };

  const handlePickAvatar = async () => {
    Alert.alert(
      'Update Profile Picture 📸',
      'Choose avatar image source:',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission Required', 'Camera access is required to take a picture.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
            });
            if (!res.canceled && res.assets?.[0]?.uri) {
              const uri = res.assets[0].uri;
              setCustomAvatar(uri);
              await AsyncStorage.setItem('@user_avatar', uri);
              await persistAvatarToServer(uri);
              Alert.alert('Success', 'Profile picture updated and saved!');
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission Required', 'Gallery access is required to pick an image.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
            });
            if (!res.canceled && res.assets?.[0]?.uri) {
              const uri = res.assets[0].uri;
              setCustomAvatar(uri);
              await AsyncStorage.setItem('@user_avatar', uri);
              await persistAvatarToServer(uri);
              Alert.alert('Success', 'Profile picture updated and saved!');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removeSavedPost = async (id: string) => {
    try {
      const updated = savedPosts.filter(p => p.id !== id);
      setSavedPosts(updated);
      await AsyncStorage.setItem('@saved_posts', JSON.stringify(updated));
      Alert.alert('Removed', 'Post removed from saved bookmarks.');
    } catch (e) {
      console.warn('Error removing bookmark:', e);
    }
  };

  const totalReportsCount = userReports.length;
  const resolvedCount = userReports.filter((r) => ['resolved', 'closed', 'completed'].includes(r.status)).length;
  const avatarDisplayUri = customAvatar || profile?.avatar_url || user?.avatar_url;
  const civicScore = profile?.civic_impact_score ?? (user as any)?.civic_impact_score ?? 0;
  const userLevel = profile?.level ?? (user as any)?.level ?? 1;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Citizen Profile & Identity</Text>
        <TouchableOpacity style={styles.settingsIconBtn} onPress={() => navigation.navigate('Settings')}>
          <Settings size={22} color="#00152A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
      >
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} activeOpacity={0.85}>
            {avatarDisplayUri ? (
              <Image source={{ uri: avatarDisplayUri }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, { backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#FFF', fontSize: 28, fontWeight: 'bold' }}>
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraOverlayBtn}>
              <Camera size={13} color="#FFF" />
            </View>
            <View style={styles.verifiedShield}>
              <ShieldCheck size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{(user?.name || user?.email || 'Active Citizen').toUpperCase()}</Text>

          <View style={styles.levelTagPill}>
            <Award size={14} color="#7C3AED" />
            <Text style={styles.levelTagText}>Civic Sentinel ⭐ • LEVEL {userLevel < 10 ? `0${userLevel}` : userLevel}</Text>
          </View>

          <View style={styles.locationMetaRow}>
            <MapPin size={13} color="#7C3AED" />
            <Text style={styles.locationMetaText}>{profile?.ward_name || (user as any)?.ward_name || 'Bhopal, MP'} • Civic Sentinel</Text>
          </View>

          {/* XP Progress Level Card */}
          <View style={styles.xpProgressCard}>
            <View style={styles.xpHeaderRow}>
              <Text style={styles.xpProgressTitle}>Level {userLevel < 10 ? `0${userLevel}` : userLevel} Sentinel Rank</Text>
              <Text style={styles.xpProgressSub}>{civicScore} XP</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.min(100, (civicScore % 1000) / 10)}%` }]} />
            </View>
            <Text style={styles.xpNextLevelText}>Keep reporting to unlock Level {userLevel + 1}! 🚀</Text>
          </View>

          {/* Quick Stats Metric Band */}
          <View style={styles.statsBand}>
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{civicScore}</Text>
              <Text style={styles.statLbl}>Impact XP</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#7C3AED' }]}>{totalReportsCount}</Text>
              <Text style={styles.statLbl}>My Reports</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#10B981' }]}>{resolvedCount}</Text>
              <Text style={styles.statLbl}>Resolved</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#F59E0B' }]}>{savedPosts.length}</Text>
              <Text style={styles.statLbl}>Saved</Text>
            </View>
          </View>
        </View>

        {/* Detailed Account & Contact Info Card */}
        <View style={styles.contactCard}>
          <Text style={styles.sectionTitleText}>Account Details & Verification</Text>

          <View style={styles.contactRow}>
            <Mail size={16} color="#7C3AED" />
            <View>
              <Text style={styles.contactLabel}>Email Address</Text>
              <Text style={styles.contactVal}>{user?.email || 'No email provided'}</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <Phone size={16} color="#7C3AED" />
            <View>
              <Text style={styles.contactLabel}>Phone Number</Text>
              <Text style={styles.contactVal}>{profile?.phone || user?.phone || 'No phone number added'}</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <CheckCircle2 size={16} color="#10B981" />
            <View>
              <Text style={styles.contactLabel}>Verification Badge</Text>
              <Text style={[styles.contactVal, { color: '#10B981', fontWeight: '800' }]}>
                {user?.role === 'ngo' ? 'Verified NGO Partner ✅' : 'Verified Community Member ✅'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation: My Reports vs Saved Posts vs Badges */}
        <View style={styles.tabSelectorRow}>
          <TouchableOpacity
            style={[styles.tabSelectorBtn, activeTab === 'my_reports' && styles.tabSelectorBtnActive]}
            onPress={() => setActiveTab('my_reports')}
          >
            <FileText size={15} color={activeTab === 'my_reports' ? '#7C3AED' : '#64748B'} />
            <Text style={[styles.tabSelectorText, activeTab === 'my_reports' && styles.tabSelectorTextActive]}>
              My Reports ({userReports.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSelectorBtn, activeTab === 'saved_posts' && styles.tabSelectorBtnActive]}
            onPress={() => setActiveTab('saved_posts')}
          >
            <Bookmark size={15} color={activeTab === 'saved_posts' ? '#7C3AED' : '#64748B'} />
            <Text style={[styles.tabSelectorText, activeTab === 'saved_posts' && styles.tabSelectorTextActive]}>
              Saved ({savedPosts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSelectorBtn, activeTab === 'badges' && styles.tabSelectorBtnActive]}
            onPress={() => setActiveTab('badges')}
          >
            <Award size={15} color={activeTab === 'badges' ? '#7C3AED' : '#64748B'} />
            <Text style={[styles.tabSelectorText, activeTab === 'badges' && styles.tabSelectorTextActive]}>
              Badges
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1 Content: My Reports */}
        {activeTab === 'my_reports' && (
          <View style={styles.myReportsContainer}>
            {loading ? (
              <ActivityIndicator size="small" color="#7C3AED" style={{ padding: 20 }} />
            ) : userReports.length === 0 ? (
              <View style={styles.emptyReportsBox}>
                <FileText size={32} color="#94A3B8" />
                <Text style={styles.emptyReportsText}>No reports created yet.</Text>
                <TouchableOpacity style={styles.createReportBtn} onPress={() => navigation.navigate('Report')}>
                  <Text style={styles.createReportBtnText}>Post First Issue +</Text>
                </TouchableOpacity>
              </View>
            ) : (
              userReports.map((report) => {
                const mediaUrl = (Array.isArray(report.media_urls) ? report.media_urls[0] : null) ||
                  (typeof report.media_urls === 'string' && report.media_urls.startsWith('[') ? JSON.parse(report.media_urls)[0] : report.media_urls);

                return (
                  <View key={report.id} style={styles.reportCard}>
                    {mediaUrl && (
                      <Image source={{ uri: mediaUrl }} style={styles.reportImgPreview} />
                    )}
                    <View style={styles.reportCardContent}>
                      <View style={styles.reportHeaderRow}>
                        <Text style={styles.reportCategoryPill}>{report.category?.toUpperCase() || 'CIVIC ISSUE'}</Text>
                        <View style={styles.reportStatusBadge}>
                          <Text style={styles.reportStatusText}>{report.status?.toUpperCase() || 'ACTIVE'}</Text>
                        </View>
                      </View>

                      <Text style={styles.reportDescText} numberOfLines={2}>
                        {report.description || report.incident_title || 'Civic Issue Report'}
                      </Text>

                      <View style={styles.reportLocRow}>
                        <MapPin size={12} color="#7C3AED" />
                        <Text style={styles.reportLocText} numberOfLines={1}>
                          {report.address || report.location_address || 'Bhopal Ward 12'}
                        </Text>
                      </View>

                      <Text style={styles.reportDateText}>
                        Posted: {new Date(report.created_at || Date.now()).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Tab 2 Content: Saved Posts */}
        {activeTab === 'saved_posts' && (
          <View style={styles.myReportsContainer}>
            {savedPosts.length === 0 ? (
              <View style={styles.emptyReportsBox}>
                <Bookmark size={32} color="#94A3B8" />
                <Text style={styles.emptyReportsText}>No saved posts yet.</Text>
                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                  Tap the bookmark icon on any post in your feed to save it here.
                </Text>
              </View>
            ) : (
              savedPosts.map((post) => (
                <View key={post.id} style={styles.reportCard}>
                  <View style={styles.reportCardContent}>
                    <View style={styles.reportHeaderRow}>
                      <Text style={styles.reportCategoryPill}>{post.category || 'COMMUNITY POST'}</Text>
                      <TouchableOpacity onPress={() => removeSavedPost(post.id)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.reportDescText} numberOfLines={2}>
                      {post.title || post.description || 'Saved Community Incident'}
                    </Text>

                    <View style={styles.reportLocRow}>
                      <MapPin size={12} color="#7C3AED" />
                      <Text style={styles.reportLocText} numberOfLines={1}>
                        {post.location || 'Ward 12, Bhopal'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.viewSavedDetailBtn}
                      onPress={() => navigation.navigate('IncidentDetail', { id: post.id })}
                    >
                      <Text style={styles.viewSavedDetailText}>View Full Issue →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 3 Content: Earned Civic Badges */}
        {activeTab === 'badges' && (
          <View style={styles.badgesSection}>
            {profile?.badges && profile.badges.length > 0 ? (
              profile.badges.map((badge: any) => (
                <View key={badge.id} style={styles.badgeCardRow}>
                  <Text style={styles.badgeIconText}>{badge.icon || '🏆'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.badgeTitle}>{badge.name}</Text>
                    <Text style={styles.badgeSub}>{badge.description}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' }}>No badges earned yet.</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 4 }}>Report issues to earn civic badges!</Text>
              </View>
            )}
          </View>
        )}

        {/* Settings Shortcut Card */}
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Feedback')}>
            <Sparkles size={18} color="#F59E0B" />
            <Text style={[styles.menuText, { color: '#F59E0B' }]}>Give App Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
            <Settings size={18} color="#7C3AED" />
            <Text style={[styles.menuText, { color: '#7C3AED' }]}>Account & Preference Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={logout}>
            <LogOut size={18} color="#EF4444" />
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  settingsIconBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImg: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#7C3AED',
  },
  cameraOverlayBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#7C3AED',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedShield: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  levelTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  levelTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  locationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  xpProgressCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  xpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpProgressTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  xpProgressSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  xpTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  xpNextLevelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  statsBand: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    marginTop: 14,
    justifyContent: 'space-around',
  },
  statCell: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    elevation: 2,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  contactVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabSelectorBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabSelectorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabSelectorTextActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  myReportsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  emptyReportsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyReportsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
  },
  createReportBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  createReportBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    marginBottom: 10,
  },
  reportImgPreview: {
    width: '100%',
    height: 120,
  },
  reportCardContent: {
    padding: 14,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reportCategoryPill: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reportStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reportStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  reportDescText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  reportLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  reportLocText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  reportDateText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  viewSavedDetailBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewSavedDetailText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  badgesSection: {
    gap: 10,
    marginBottom: 16,
  },
  badgeCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    elevation: 1,
  },
  badgeIconText: {
    fontSize: 24,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
