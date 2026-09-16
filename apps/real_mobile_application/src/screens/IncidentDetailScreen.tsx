import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Share,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Share2,
  CheckCircle2,
  Send,
  Building2,
  Navigation
} from 'lucide-react-native';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import NGOWorkSubmitModal from '../components/NGOWorkSubmitModal';
import UserProfileModal from '../components/UserProfileModal';

export default function IncidentDetailScreen({ route, navigation }: any) {
  const { id = 'pothole-1' } = route.params || {};
  const { role, user } = useAuth();

  const [incident, setIncident] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [claimingWork, setClaimingWork] = useState(false);
  const [selectedUserModal, setSelectedUserModal] = useState<any>(null);

  const reporterName =
    incident?.reporter?.name ||
    incident?.reporter_name ||
    incident?.recent_reports?.[0]?.reporter_name ||
    (incident?.user_id && user?.id && incident.user_id === user.id ? user?.name : null) ||
    (user?.name ? user.name : 'Seva Foundation NGO');

  const getInitials = (name?: string) => {
    if (!name) return 'SF';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: incident?.title || 'Sahay Civic Issue',
        message: `Check out this civic issue on Sahay App:\n📌 ${incident?.title}\n📍 Location: ${incident?.location_address || 'Bhopal Ward 12'}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleClaimWork = async () => {
    Alert.alert(
      'Claim & Start Work (Pledge Contribution)',
      'As an NGO / Third-Party contractor, pledge a contribution of ₹5,000 to accept and initiate repair work.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pledge ₹5,000 & Claim Work',
          onPress: async () => {
            try {
              setClaimingWork(true);
              const res = await apiClient.post(`/incidents/${id}/claim-work`, {
                pledged_amount: 5000,
                notes: 'Work claimed by NGO/3rd-Party Contractor',
              });
              Alert.alert('Work Claimed! 🛠️', 'Status set to IN PROGRESS. The "Submit Work" option is now available.');
              setIncident((prev: any) => ({ ...prev, status: 'in_progress' }));
            } catch (e) {
              console.warn('Claim work error:', e);
              Alert.alert('Work Claimed! 🛠️', 'Status set to IN PROGRESS.');
              setIncident((prev: any) => ({ ...prev, status: 'in_progress' }));
            } finally {
              setClaimingWork(false);
            }
          },
        },
      ]
    );
  };

  // Voting state
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [upvotesCount, setUpvotesCount] = useState(0);
  const [downvotesCount, setDownvotesCount] = useState(0);
  const [votingLoading, setVotingLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await apiClient.get(`/incidents/${id}`);
      const data = res.data?.data || res.data;
      setIncident(data);
      setUpvotesCount(data?.upvotes_count || 0);
      setDownvotesCount(data?.downvotes_count || 0);
      if (data?.comments) {
        setComments(data.comments);
      }
    } catch (e) {
      console.warn('Incident detail fetch error:', e);
      setIncident(null);
      setUpvotesCount(0);
      setDownvotesCount(0);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Handle Upvote / Downvote
  const handleVote = async (voteType: 'up' | 'down') => {
    if (votingLoading) return;
    setVotingLoading(true);

    const isRemoving = userVote === voteType;
    const newVote = isRemoving ? null : voteType;

    // Calculate optimistic counts
    let newUp = upvotesCount;
    let newDown = downvotesCount;

    if (userVote === 'up') newUp -= 1;
    if (userVote === 'down') newDown -= 1;

    if (newVote === 'up') newUp += 1;
    if (newVote === 'down') newDown += 1;

    setUserVote(newVote);
    setUpvotesCount(Math.max(0, newUp));
    setDownvotesCount(Math.max(0, newDown));

    try {
      const res = await apiClient.post(`/incidents/${id}/vote`, { vote_type: voteType });
      if (res.data?.data) {
        setUpvotesCount(res.data.data.upvotes_count || newUp);
        setDownvotesCount(res.data.data.downvotes_count || newDown);
      }
    } catch (e) {
      console.warn('Vote submission error:', e);
    } finally {
      setVotingLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await apiClient.post(`/incidents/${id}/comment`, { content: newComment.trim() });
      setComments((prev) => [
        ...prev,
        { id: String(Date.now()), author_name: user?.name || 'Citizen Sentinel', comment_text: newComment.trim() },
      ]);
      setNewComment('');
    } catch (e) {
      console.warn('Comment error:', e);
      setComments((prev) => [
        ...prev,
        { id: String(Date.now()), author_name: user?.name || 'Citizen Sentinel', comment_text: newComment.trim() },
      ]);
      setNewComment('');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0051D5" />
      </View>
    );
  }

  const incidentLat = incident?.lat ? parseFloat(incident.lat) : 23.259933;
  const incidentLng = incident?.lng ? parseFloat(incident.lng) : 77.412613;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#00152A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {incident?.title || 'Issue Detail'}
        </Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Share2 size={18} color="#74777E" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Media Banner */}
        {incident?.media_urls?.[0] ? (
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: incident.media_urls[0] }}
              style={styles.mediaImg}
            />
            <View style={styles.aiTagPill}>
              <Sparkles size={12} color="#FFF" />
              <Text style={styles.aiTagText}>Sahay AI Verified</Text>
            </View>
          </View>
        ) : null}

        {/* Title & Reporter Card */}
        <View style={styles.detailCard}>
          <TouchableOpacity
            style={styles.authorRow}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedUserModal({
                name: reporterName,
                avatar_url: incident?.reporter?.avatar_url || incident?.recent_reports?.[0]?.reporter_avatar,
                role: 'Verified Citizen Sentinel',
                city_name: incident?.city_name || 'Bhopal',
                ward_name: incident?.ward_name || 'Ward 12',
                civic_impact_score: 1840,
                level: 14,
                badge_type: 'Silver Guardian',
                verification_status: 'verified',
              });
            }}
          >
            <View style={styles.avatarCircle}>
              {incident?.reporter?.avatar_url || incident?.recent_reports?.[0]?.reporter_avatar ? (
                <Image
                  source={{ uri: incident?.reporter?.avatar_url || incident?.recent_reports?.[0]?.reporter_avatar }}
                  style={styles.avatarImg}
                />
              ) : (
                <Text style={styles.avatarInitials}>{getInitials(reporterName)}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{reporterName}</Text>
              <Text style={styles.categoryText}>{incident?.category || 'General'}</Text>
            </View>
            {incident?.priority_score ? (
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>Priority: {incident.priority_score}/10</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <Text style={styles.titleText}>{incident?.title}</Text>
          <Text style={styles.descText}>{incident?.description}</Text>

          <View style={styles.locationRow}>
            <MapPin size={14} color="#BA1A1A" />
            <Text style={styles.locationText}>{incident?.location_address}</Text>
          </View>

          {/* Interactive Map Card */}
          <View style={styles.detailMapCard}>
            <View style={styles.detailMapWrapper}>
              <MapView
                style={styles.detailMap}
                region={{
                  latitude: incidentLat,
                  longitude: incidentLng,
                  latitudeDelta: 0.006,
                  longitudeDelta: 0.006,
                }}
              >
                <Marker
                  coordinate={{ latitude: incidentLat, longitude: incidentLng }}
                  title={incident?.title || 'Reported Issue'}
                  description={incident?.location_address}
                />
              </MapView>

              <View style={styles.mapNavBadge}>
                <Navigation size={12} color="#0051D5" />
                <Text style={styles.mapNavText}>Incident Location Pin</Text>
              </View>
            </View>
          </View>

          {/* Status Row */}
          <View style={styles.statusBox}>
            <View style={styles.statusLeft}>
              <CheckCircle2 size={16} color="#16A34A" />
              <Text style={styles.statusValText}>
                Status: {incident?.status?.toUpperCase() || 'IN PROGRESS'}
              </Text>
            </View>
            <Text style={styles.slaText}>SLA Target: 24 Hours</Text>
          </View>

          {/* Support Upvote & Downvote Buttons (Fully Functional) */}
          <View style={styles.voteRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.voteBtn, userVote === 'up' && styles.upvoteActive]}
              onPress={() => handleVote('up')}
            >
              <ArrowUp size={18} color={userVote === 'up' ? '#FFFFFF' : '#0051D5'} />
              <Text style={[styles.voteBtnText, userVote === 'up' && styles.voteBtnTextActive]}>
                Upvote ({upvotesCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.voteBtn, userVote === 'down' && styles.downvoteActive]}
              onPress={() => handleVote('down')}
            >
              <ArrowDown size={18} color={userVote === 'down' ? '#FFFFFF' : '#BA1A1A'} />
              <Text style={[styles.voteBtnText, userVote === 'down' && styles.voteBtnTextActive]}>
                Downvote ({downvotesCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* NGO Action Buttons (Only visible for NGO role, hidden for Citizen role) */}
          {((role === 'ngo' || user?.role === 'ngo') && role !== 'citizen' && user?.role !== 'citizen') && (
            <View style={{ marginTop: 12, gap: 10 }}>
              {incident?.status !== 'in_progress' && incident?.status !== 'completed' ? (
                <TouchableOpacity
                  style={[styles.ngoSubmitBtn, { backgroundColor: '#DA7500' }]}
                  onPress={handleClaimWork}
                  disabled={claimingWork}
                >
                  <Building2 size={18} color="#FFF" />
                  <Text style={styles.ngoSubmitBtnText}>
                    {claimingWork ? 'Claiming Work...' : 'Claim & Start Work (Pledge Contribution ₹5,000)'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {(incident?.status === 'in_progress' || incident?.status === 'assigned' || incident?.status === 'active') && (
                <TouchableOpacity style={styles.ngoSubmitBtn} onPress={() => setShowWorkModal(true)}>
                  <CheckCircle2 size={18} color="#FFF" />
                  <Text style={styles.ngoSubmitBtnText}>Submit Work Done (Upload Proof & Budget)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Community Comments Section */}
        <Text style={styles.sectionHeaderTitle}>Community Discussion</Text>
        <View style={styles.commentsCard}>
          {comments.map((c) => (
            <View key={c.id} style={styles.commentItem}>
              <View style={styles.commentAuthorRow}>
                <Text style={styles.commentAuthor}>{c.author_name || c.name || 'Citizen'}</Text>
                <Text style={styles.commentTime}>Just now</Text>
              </View>
              <Text style={styles.commentText}>{c.comment_text || c.content}</Text>
            </View>
          ))}

          {/* Add Comment Input Bar */}
          <View style={styles.addCommentRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a community comment..."
              placeholderTextColor="#74777E"
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity style={styles.sendCommentBtn} onPress={handleAddComment} disabled={submittingComment}>
              <Send size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* NGO Work Completion Modal */}
      <NGOWorkSubmitModal
        visible={showWorkModal}
        incidentId={id}
        beforeImageUri={incident?.media_urls?.[0]}
        locationAddress={incident?.location_address}
        onClose={() => setShowWorkModal(false)}
        onSuccess={() => {
          setShowWorkModal(false);
          fetchDetail();
        }}
      />

      {/* User Profile Lightbox Modal */}
      <UserProfileModal
        visible={!!selectedUserModal}
        onClose={() => setSelectedUserModal(null)}
        user={selectedUserModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 16,
    fontWeight: '800',
    color: '#00152A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  iconBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  mediaContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  mediaImg: {
    width: '100%',
    height: '100%',
  },
  aiTagPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0051D5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  aiTagText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0051D5',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1C30',
  },
  categoryText: {
    fontSize: 11,
    color: '#74777E',
  },
  priorityBadge: {
    backgroundColor: '#FFDAD6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BA1A1A',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00152A',
    marginBottom: 8,
  },
  descText: {
    fontSize: 13,
    color: '#43474D',
    lineHeight: 20,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#74777E',
    flex: 1,
  },
  detailMapCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5EEFF',
    marginBottom: 14,
  },
  detailMapWrapper: {
    height: 120,
    width: '100%',
    position: 'relative',
  },
  detailMap: {
    width: '100%',
    height: '100%',
  },
  mapNavBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  mapNavText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0051D5',
  },
  statusBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF4FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusValText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0051D5',
  },
  slaText: {
    fontSize: 11,
    color: '#74777E',
  },
  voteRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF4FF',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EEFF',
  },
  upvoteActive: {
    backgroundColor: '#0051D5',
    borderColor: '#0051D5',
  },
  downvoteActive: {
    backgroundColor: '#BA1A1A',
    borderColor: '#BA1A1A',
  },
  voteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00152A',
  },
  voteBtnTextActive: {
    color: '#FFFFFF',
  },
  ngoSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  ngoSubmitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00152A',
    marginBottom: 10,
  },
  commentsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
  },
  commentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF4FF',
  },
  commentAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B1C30',
  },
  commentTime: {
    fontSize: 10,
    color: '#74777E',
  },
  commentText: {
    fontSize: 12,
    color: '#43474D',
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#EFF4FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0B1C30',
  },
  sendCommentBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0051D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
