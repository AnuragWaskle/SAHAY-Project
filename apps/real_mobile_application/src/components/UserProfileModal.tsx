import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  ShieldCheck,
  Award,
  MapPin,
  X,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    role?: string;
    city_name?: string;
    ward_name?: string;
    civic_impact_score?: number;
    level?: number;
    badge_type?: string;
    verification_status?: string;
  } | null;
}

export default function UserProfileModal({ visible, onClose, user }: UserProfileModalProps) {
  if (!user) return null;

  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();
  const roleName = user.role ? user.role.replace(/_/g, ' ').toUpperCase() : 'CIVIC SENTINEL';
  const xpScore = user.civic_impact_score || 1840;
  const level = user.level || 7;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>User Civic Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Profile Avatar & Name */}
            <View style={styles.profileBox}>
              <View style={styles.avatarContainer}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.initialsAvatar}>
                    <Text style={styles.initialsText}>{initial}</Text>
                  </View>
                )}
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={14} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.userName}>{user.name || 'Citizen User'}</Text>

              <View style={styles.rolePill}>
                <Award size={13} color="#7C3AED" />
                <Text style={styles.roleText}>{roleName} • LEVEL {level < 10 ? `0${level}` : level}</Text>
              </View>

              <View style={styles.locationRow}>
                <MapPin size={13} color="#7C3AED" />
                <Text style={styles.locationText}>{user.ward_name || user.city_name || 'Ward 12, Bhopal Central'}</Text>
              </View>
            </View>

            {/* Impact Metric Cards */}
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>{xpScore.toLocaleString()}</Text>
                <Text style={styles.metricLbl}>Impact XP</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={[styles.metricVal, { color: '#7C3AED' }]}>14</Text>
                <Text style={styles.metricLbl}>Reports</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={[styles.metricVal, { color: '#10B981' }]}>12</Text>
                <Text style={styles.metricLbl}>Resolved</Text>
              </View>
            </View>

            {/* User Contact & Meta Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Contact & Account Information</Text>

              <View style={styles.infoRow}>
                <Mail size={15} color="#7C3AED" />
                <Text style={styles.infoText}>{user.email || `${user.name?.toLowerCase().replace(/\s+/g, '')}@sahay.org`}</Text>
              </View>

              <View style={styles.infoRow}>
                <Phone size={15} color="#7C3AED" />
                <Text style={styles.infoText}>{user.phone || '+91 98260 11223'}</Text>
              </View>

              <View style={styles.infoRow}>
                <CheckCircle2 size={15} color="#10B981" />
                <Text style={styles.infoText}>Verification Status: Verified Sentinel Account</Text>
              </View>
            </View>

            {/* Civic Badges */}
            <View style={styles.badgesCard}>
              <Text style={styles.infoCardTitle}>Earned Civic Badges</Text>
              <View style={styles.badgeList}>
                <View style={styles.badgeItem}>
                  <Text style={styles.badgeEmoji}>🏆</Text>
                  <Text style={styles.badgeName}>Pothole Patrol Master</Text>
                </View>
                <View style={styles.badgeItem}>
                  <Text style={styles.badgeEmoji}>💧</Text>
                  <Text style={styles.badgeName}>Water Conservation Guardian</Text>
                </View>
                <View style={styles.badgeItem}>
                  <Text style={styles.badgeEmoji}>🛡️</Text>
                  <Text style={styles.badgeName}>Community Sentinel</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Close Profile</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  scrollBody: {
    paddingVertical: 16,
    gap: 16,
  },
  profileBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  initialsAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#7C3AED',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    gap: 10,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  badgesCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
  },
  badgeList: {
    gap: 8,
    marginTop: 6,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
  },
  badgeEmoji: {
    fontSize: 18,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  doneBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
