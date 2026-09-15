import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet
} from 'react-native';
import {
  ShieldCheck,
  Award,
  MapPin,
  CheckCircle2,
  FileText,
  Gift,
  Clock,
  Settings,
  LogOut,
  ChevronRight,
  TrendingUp,
  Coins
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Citizen Profile</Text>
        <TouchableOpacity style={styles.settingsIconBtn} onPress={() => navigation.navigate('Settings')}>
          <Settings size={20} color="#00152A" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
              }}
              style={styles.avatarImg}
            />
            <View style={styles.verifiedShield}>
              <ShieldCheck size={16} color="#FFF" />
            </View>
          </View>

          <Text style={styles.profileName}>{user?.name?.toUpperCase() || 'ARYAN'}</Text>

          <View style={styles.levelTagPill}>
            <Award size={14} color="#0051D5" />
            <Text style={styles.levelTagText}>Civic Ranger ⭐ • LEVEL 07</Text>
          </View>

          <View style={styles.locationMetaRow}>
            <MapPin size={13} color="#0051D5" />
            <Text style={styles.locationMetaText}>Ward 12, Bhopal • Member since Jan 2024</Text>
          </View>

          {/* Quick Stats Metric Band */}
          <View style={styles.statsBand}>
            <View style={styles.statCell}>
              <Text style={styles.statVal}>1,840</Text>
              <Text style={styles.statLbl}>XP</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#0051D5' }]}>86</Text>
              <Text style={styles.statLbl}>Issues</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#16A34A' }]}>42</Text>
              <Text style={styles.statLbl}>Resolved</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#DA7500' }]}>18</Text>
              <Text style={styles.statLbl}>Quests</Text>
            </View>
          </View>
        </View>

        {/* Lifetime Civic Impact */}
        <View style={styles.impactCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.impactTitle}>📊 Lifetime Civic Impact</Text>
            <View style={styles.syncTag}>
              <Text style={styles.syncTagText}>Live Sync</Text>
            </View>
          </View>
          <Text style={styles.impactSub}>Verified municipal contributions across Bhopal</Text>

          <View style={styles.impactGrid}>
            <View style={styles.impactCell}>
              <View style={styles.impactCellHeader}>
                <FileText size={16} color="#0051D5" />
                <Text style={styles.rateTag}>↑ 12 mo</Text>
              </View>
              <Text style={styles.impactVal}>86</Text>
              <Text style={styles.impactLbl}>Issues Reported</Text>
            </View>

            <View style={styles.impactCell}>
              <View style={styles.impactCellHeader}>
                <CheckCircle2 size={16} color="#16A34A" />
                <Text style={styles.rateTagGreen}>98% rate</Text>
              </View>
              <Text style={styles.impactVal}>42</Text>
              <Text style={styles.impactLbl}>Issues Resolved</Text>
            </View>

            <View style={styles.impactCell}>
              <View style={styles.impactCellHeader}>
                <TrendingUp size={16} color="#DA7500" />
                <Text style={styles.rateTag}>Ward 12</Text>
              </View>
              <Text style={styles.impactVal}>317</Text>
              <Text style={styles.impactLbl}>Upvotes Received</Text>
            </View>

            <View style={styles.impactCell}>
              <View style={styles.impactCellHeader}>
                <Coins size={16} color="#0051D5" />
                <Text style={styles.rateTag}>Impact</Text>
              </View>
              <Text style={styles.impactVal}>₹1.2L</Text>
              <Text style={styles.impactLbl}>Infra Supported</Text>
            </View>
          </View>
        </View>

        {/* Rewards Marketplace Callout */}
        <TouchableOpacity
          style={styles.rewardsCard}
          onPress={() => navigation.navigate('RewardMarketplace')}
        >
          <View style={styles.rewardsLeft}>
            <View style={styles.giftIconWrap}>
              <Gift size={22} color="#DA7500" />
            </View>
            <View>
              <Text style={styles.rewardsTitle}>Rewards Marketplace</Text>
              <Text style={styles.rewardsSub}>Redeem 450 Civic Coins for perks</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#0051D5" />
        </TouchableOpacity>

        {/* Action Menu */}
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyReports')}>
            <FileText size={18} color="#0051D5" />
            <Text style={styles.menuText}>My Reports</Text>
            <ChevronRight size={16} color="#C3C6CE" style={styles.menuChevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Clock size={18} color="#0051D5" />
            <Text style={styles.menuText}>My Activity History</Text>
            <ChevronRight size={16} color="#C3C6CE" style={styles.menuChevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Verify')}>
            <CheckCircle2 size={18} color="#16A34A" />
            <Text style={styles.menuText}>My Verification Requests</Text>
            <ChevronRight size={16} color="#C3C6CE" style={styles.menuChevron} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={logout}>
            <LogOut size={18} color="#BA1A1A" />
            <Text style={[styles.menuText, { color: '#BA1A1A' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00152A',
  },
  settingsIconBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#102A43',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#0051D5',
  },
  verifiedShield: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0051D5',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00152A',
  },
  levelTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  levelTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0051D5',
  },
  locationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationMetaText: {
    fontSize: 11,
    color: '#74777E',
  },
  statsBand: {
    flexDirection: 'row',
    backgroundColor: '#EFF4FF',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginTop: 16,
    justifyContent: 'space-around',
  },
  statCell: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00152A',
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#74777E',
    marginTop: 2,
  },
  impactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00152A',
  },
  syncTag: {
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  syncTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0051D5',
  },
  impactSub: {
    fontSize: 11,
    color: '#74777E',
    marginTop: 2,
    marginBottom: 12,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  impactCell: {
    width: '48%',
    backgroundColor: '#EFF4FF',
    borderRadius: 12,
    padding: 12,
  },
  impactCellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rateTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0051D5',
  },
  rateTagGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  impactVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00152A',
  },
  impactLbl: {
    fontSize: 11,
    color: '#74777E',
    marginTop: 2,
  },
  rewardsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFDCC4',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  rewardsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  giftIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2F1500',
  },
  rewardsSub: {
    fontSize: 11,
    color: '#6F3900',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF4FF',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1C30',
    marginLeft: 12,
  },
  menuChevron: {
    marginLeft: 'auto',
  },
});
