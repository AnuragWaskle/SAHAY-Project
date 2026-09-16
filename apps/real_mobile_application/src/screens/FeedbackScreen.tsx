import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '../api/client';

export default function FeedbackScreen() {
  const navigation = useNavigation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating between 1 and 5 stars.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/users/feedback', { rating, comment });
      Alert.alert('Success', 'Thank you for your feedback!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full bg-gray-50">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">App Feedback</Text>
        <View className="w-10" />
      </View>

      <View className="px-6 py-8">
        <Text className="text-2xl font-extrabold text-gray-800 text-center mb-2">How are we doing?</Text>
        <Text className="text-gray-500 text-center mb-8">
          Your feedback helps us improve Sahay for everyone.
        </Text>

        <View className="flex-row justify-center gap-4 mb-10">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Star
                size={40}
                color={star <= rating ? '#F59E0B' : '#E5E7EB'}
                fill={star <= rating ? '#F59E0B' : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-sm font-bold text-gray-700 mb-2">Additional Comments (Optional)</Text>
        <TextInput
          className="bg-gray-50 rounded-2xl p-4 text-gray-800 border border-gray-200"
          placeholder="Tell us what you like or what we could improve..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={comment}
          onChangeText={setComment}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          className={`mt-8 py-4 rounded-2xl items-center shadow-sm ${submitting ? 'bg-indigo-400' : 'bg-brand-indigo'}`}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-bold text-lg">Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
