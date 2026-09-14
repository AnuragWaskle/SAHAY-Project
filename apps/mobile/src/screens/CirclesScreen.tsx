import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Users, Send, MessageSquare, Plus, ArrowRight, UserPlus, LogOut } from 'lucide-react-native';
import apiClient from '../api/client';

interface Circle {
  id: string;
  name: string;
  type: string;
  description: string;
  member_count: number;
  is_member: boolean;
  ward_name?: string;
  city_name?: string;
}

interface Message {
  id: string;
  message: string;
  user_name: string;
  avatar_url?: string;
  created_at: string;
}

export default function CirclesScreen() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Chat States
  const [activeCircle, setActiveCircle] = useState<Circle | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Create Circle States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleDesc, setNewCircleDesc] = useState('');
  const [creatingCircle, setCreatingCircle] = useState(false);

  const fetchCircles = useCallback(async () => {
    try {
      const res = await apiClient.get('/circles');
      if (res.data?.success) {
        setCircles(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCircles();
  }, [fetchCircles]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCircles();
  };

  const handleJoinLeaveCircle = async (circle: Circle) => {
    try {
      const endpoint = circle.is_member ? `/circles/${circle.id}/leave` : `/circles/${circle.id}/join`;
      const res = await apiClient.post(endpoint);
      if (res.data?.success) {
        Alert.alert(circle.is_member ? 'Left Circle' : 'Joined Circle 🎉', res.data.message);
        setCircles(prev =>
          prev.map(c =>
            c.id === circle.id
              ? { ...c, is_member: !c.is_member, member_count: c.member_count + (c.is_member ? -1 : 1) }
              : c
          )
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update membership');
    }
  };

  const fetchMessages = async (circleId: string) => {
    setLoadingMessages(true);
    try {
      const res = await apiClient.get(`/circles/${circleId}/messages`);
      if (res.data?.success) {
        setMessages(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleOpenChat = (circle: Circle) => {
    setActiveCircle(circle);
    setChatModalVisible(true);
    fetchMessages(circle.id);
  };

  const handleSendMessage = async () => {
    if (!activeCircle || !newMessage.trim()) return;
    setSendingMessage(true);
    try {
      const res = await apiClient.post(`/circles/${activeCircle.id}/messages`, { message: newMessage.trim() });
      if (res.data?.success) {
        setMessages(prev => [...prev, res.data.data]);
        setNewMessage('');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateCircle = async () => {
    if (!newCircleName.trim() || !newCircleDesc.trim()) {
      Alert.alert('Fields Required', 'Please enter a name and description.');
      return;
    }
    setCreatingCircle(true);
    try {
      const res = await apiClient.post('/circles', {
        name: newCircleName.trim(),
        description: newCircleDesc.trim(),
        city_id: '00000000-0000-0000-0000-000000000001', // Bhopal default
        type: 'general',
      });
      if (res.data?.success) {
        Alert.alert('Success 🎉', 'New local circle created!');
        setCreateModalVisible(false);
        setNewCircleName('');
        setNewCircleDesc('');
        fetchCircles();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create circle');
    } finally {
      setCreatingCircle(false);
    }
  };

  const filteredCircles = circles.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#FF7E67" />
        <Text className="mt-4 text-gray-500 font-medium">Loading social circles...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <ScrollView
        className="flex-1 px-5 pt-20"
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF7E67" />}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-5">
          <View>
            <Text className="text-3xl font-black text-gray-900 tracking-tight mb-1">Local Circles</Text>
            <Text className="text-gray-500 font-medium text-sm">Join local RWA or ward groups to discuss fixes.</Text>
          </View>
          <TouchableOpacity
            onPress={() => setCreateModalVisible(true)}
            className="w-11 h-11 bg-brand-orange rounded-2xl items-center justify-center shadow-sm"
          >
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-6 shadow-xs flex-row items-center">
          <TextInput
            placeholder="Search neighborhood circles..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-sm font-semibold text-gray-700 outline-none"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredCircles.length === 0 ? (
          <View className="items-center justify-center py-16 px-6">
            <Users size={48} color="#CBD5E1" />
            <Text className="text-center text-gray-400 font-bold text-sm mt-3">No circles matching search found</Text>
          </View>
        ) : (
          filteredCircles.map(circle => (
            <View
              key={circle.id}
              className="bg-white p-5 rounded-[26px] border border-gray-100 mb-4 shadow-sm flex flex-col"
              style={{ elevation: 2 }}
            >
              <View className="flex-row justify-between items-start mb-2.5">
                <View className="flex-1 mr-3">
                  <Text className="font-extrabold text-gray-805 text-base leading-tight">{circle.name}</Text>
                  {circle.ward_name && (
                    <Text className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{circle.ward_name}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleJoinLeaveCircle(circle)}
                  className={`px-3 py-1.5 rounded-xl border flex-row items-center ${
                    circle.is_member
                      ? 'bg-red-50 border-red-105 text-red-500'
                      : 'bg-orange-50 border-orange-105 text-brand-orange'
                  }`}
                >
                  {circle.is_member ? (
                    <>
                      <LogOut size={12} color="#EF4444" />
                      <Text className="text-red-600 font-black text-[10px] uppercase ml-1">Leave</Text>
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} color="#FF7E67" />
                      <Text className="text-brand-orange font-black text-[10px] uppercase ml-1">Join</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-gray-500 font-medium leading-relaxed mb-4">{circle.description}</Text>

              <View className="flex-row items-center justify-between pt-3.5 border-t border-gray-50">
                <Text className="text-[10px] text-gray-450 font-extrabold uppercase">
                  👥 {circle.member_count} Members
                </Text>
                
                {circle.is_member && (
                  <TouchableOpacity
                    onPress={() => handleOpenChat(circle)}
                    className="flex-row items-center bg-brand-blue px-4 py-2 rounded-xl"
                  >
                    <MessageSquare size={13} color="#FFF" />
                    <Text className="text-white font-extrabold text-[10px] uppercase ml-1.5">Enter Chat</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Chat Thread Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={chatModalVisible}
        onRequestClose={() => setChatModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-[36px] p-5 h-[80%] flex flex-col justify-between">
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
              <View>
                <Text className="text-base font-black text-gray-900">{activeCircle?.name}</Text>
                <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Discussion Board</Text>
              </View>
              <TouchableOpacity onPress={() => setChatModalVisible(false)}>
                <Text className="text-sm text-gray-400 font-bold">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 my-4 pr-1">
              {loadingMessages ? (
                <View className="py-12 items-center">
                  <ActivityIndicator size="small" color="#FF7E67" />
                </View>
              ) : messages.length === 0 ? (
                <View className="py-12 items-center">
                  <Text className="text-gray-400 font-bold text-xs">No posts yet. Say something to start the thread!</Text>
                </View>
              ) : (
                messages.map((msg, idx) => (
                  <View key={msg.id || idx} className="bg-gray-50 border border-gray-100 p-3 rounded-2xl mb-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="font-extrabold text-gray-800 text-xs">{msg.user_name}</Text>
                      <Text className="text-[9px] text-gray-400 font-medium">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-600 leading-normal font-medium">{msg.message}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input Panel */}
            <View className="flex-row items-center gap-2 border-t border-gray-50 pt-3">
              <TextInput
                placeholder="Write a message to group..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs text-gray-800 outline-none"
                value={newMessage}
                onChangeText={setNewMessage}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={sendingMessage || !newMessage.trim()}
                className="w-11 h-11 bg-brand-blue rounded-2xl items-center justify-center shadow-xs"
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={15} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Circle Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[36px] p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-5 border-b border-gray-50 pb-3">
              <Text className="text-lg font-black text-gray-900">Create Social Circle</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text className="text-sm text-gray-400 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Circle Name</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 flex-row items-center mb-4">
              <TextInput
                placeholder="e.g. Arera Colony Cleanup Crew"
                placeholderTextColor="#9CA3AF"
                className="flex-1 py-1 text-sm font-semibold text-gray-800"
                value={newCircleName}
                onChangeText={setNewCircleName}
              />
            </View>

            <Text className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Description</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 mb-5 min-h-[80px]">
              <TextInput
                placeholder="Describe the focus or boundaries of this resident RWA circle..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                className="text-gray-800 text-xs leading-normal"
                value={newCircleDesc}
                onChangeText={setNewCircleDesc}
              />
            </View>

            <TouchableOpacity
              onPress={handleCreateCircle}
              disabled={creatingCircle}
              className="bg-brand-orange py-4 rounded-2xl items-center justify-center flex-row shadow-md"
              style={{ shadowColor: '#FF7E67', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 }}
            >
              {creatingCircle ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Plus size={16} color="#FFF" />
                  <Text className="text-white font-black text-base ml-2">Confirm & Create</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
