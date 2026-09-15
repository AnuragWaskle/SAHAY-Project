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
  StyleSheet
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Send,
  Building2
} from 'lucide-react-native';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import NGOWorkSubmitModal from '../components/NGOWorkSubmitModal';

export default function IncidentDetailScreen({ route, navigation }: any) {
  const { id = 'pothole-1' } = route.params || {};
  const { role, user } = useAuth();

  const [incident, setIncident] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await apiClient.get(`/incidents/${id}`);
      setIncident(res.data);
      if (res.data?.comments) {
        setComments(res.data.comments);
      }
    } catch (e) {
      console.warn('Incident detail fetch fallback:', e);
      // Fallback mock detail
      setIncident({
        id,
        title: 'Large pothole reported on Main Market Road',
        description:
          'This pothole is becoming extremely dangerous for bikes and pedestrians during evening hours. Immediate patching required.',
        category: 'Roads',
        location_address: 'Main Market Road, Ward 12, Bhopal (Opp. SBI ATM)',
        priority_score: 9.1,
        upvotes_count: 24,
        downvotes_count: 2,
        status: 'in_progress',
        reporter: { name: 'Sunita M.' },
        media_urls: [
          'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
        ],
      });
      setComments([
        { id: 'c1', author_name: 'Aditya V.', comment_text: 'I passed by this morning. Water logging makes it worse!' },
        { id: 'c2', author_name: 'Ward Engineer', comment_text: 'Work order dispatched to local contractor.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await apiClient.post(`/incidents/${id}/comment`, { text: newComment });
      setComments((prev) => [
        ...prev,
        { id: String(Date.now()), author_name: user?.name || 'Citizen Sentinel', comment_text: newComment },
      ]);
      setNewComment('');
    } catch (e) {
      console.warn('Comment error:', e);
      // Local addition fallback
      setComments((prev) => [
        ...prev,
        { id: String(Date.now()), author_name: user?.name || 'Citizen Sentinel', comment_text: newComment },
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
        <TouchableOpacity style={styles.iconBtn}>
          <Share2 size={18} color="#74777E" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Media Banner */}
        <View style={styles.mediaContainer}>
          <Image
            source={{
              uri:
                incident?.media_urls?.[0] ||
                'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
            }}
            style={styles.mediaImg}
          />
          <View style={styles.aiTagPill}>
            <Sparkles size={12} color="#FFF" />
            <Text style={styles.aiTagText}>Sahay AI Verified (98% match)</Text>
          </View>
        </View>

        {/* Title & Reporter */}
        <View style={styles.detailCard}>
          <View style={styles.authorRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {incident?.reporter?.name ? incident.reporter.name.substring(0, 2).toUpperCase() : 'SM'}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>{incident?.reporter?.name || 'Sunita M.'}</Text>
              <Text style={styles.categoryText}>{incident?.category || 'Roads'} • Ward 12</Text>
            </View>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>Priority: {incident?.priority_score || '9.1'}/10</Text>
            </View>
          </View>

          <Text style={styles.titleText}>{incident?.title}</Text>
          <Text style={styles.descText}>{incident?.description}</Text>

          <View style={styles.locationRow}>
            <MapPin size={14} color="#BA1A1A" />
            <Text style={styles.locationText}>{incident?.location_address}</Text>
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

          {/* Support Vote Buttons */}
          <View style={styles.voteRow}>
            <TouchableOpacity style={styles.voteBtnActive}>
              <ArrowUp size={16} color="#0051D5" />
              <Text style={styles.voteBtnText}>Upvote ({incident?.upvotes_count || 24})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.voteBtn}>
              <ArrowDown size={16} color="#BA1A1A" />
              <Text style={styles.voteBtnText}>Downvote ({incident?.downvotes_count || 2})</Text>
            </TouchableOpacity>
          </View>

          {/* NGO Action Button */}
          {role === 'ngo' && (
            <TouchableOpacity style={styles.ngoSubmitBtn} onPress={() => setShowWorkModal(true)}>
              <Building2 size={18} color="#FFF" />
              <Text style={styles.ngoSubmitBtnText}>Submit Work Done (NGO Proof)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Community Comments Section */}
        <Text style={styles.sectionHeaderTitle}>Community Discussion</Text>
        <View style={styles.commentsCard}>
          {comments.map((c) => (
            <View key={c.id} style={styles.commentItem}>
              <View style={styles.commentAuthorRow}>
                <Text style={styles.commentAuthor}>{c.author_name}</Text>
                <Text style={styles.commentTime}>Just now</Text>
              </View>
              <Text style={styles.commentText}>{c.comment_text}</Text>
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
        onClose={() => setShowWorkModal(false)}
        onSuccess={() => {
          setShowWorkModal(false);
          fetchDetail();
        }}
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
  voteBtnActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E5EEFF',
    paddingVertical: 10,
    borderRadius: 16,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF4FF',
    paddingVertical: 10,
    borderRadius: 16,
  },
  voteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00152A',
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
