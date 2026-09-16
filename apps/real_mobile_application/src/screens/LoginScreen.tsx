import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { ArrowRight, UserPlus, Sparkles } from 'lucide-react-native';
import apiClient from '../api/client';

const SAHAY_LOGO = require('../../assets/images/sahay-logo.png');

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    setError('');
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      // Call the real backend which triggers Twilio SMS
      await apiClient.post('/auth/send-otp', { phone: cleanPhone });

      // Only navigate after SMS is confirmed sent
      navigation.navigate('Otp', {
        phone: cleanPhone,
        mode: 'signin'
      });
    } catch (e: any) {
      const msg =
        e.response?.data?.error ||
        e.userMessage ||
        'Failed to send OTP. Please check your number and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Banner */}
        <View style={styles.headerBanner}>
          <Image source={SAHAY_LOGO} style={{ width: 100, height: 100, borderRadius: 20, marginBottom: 8 }} resizeMode="contain" />
          <Text style={styles.brandTitle}>Sahay</Text>
          <Text style={styles.brandSubtitle}>Report. Track. Resolve.</Text>
          
          <View style={styles.aiPill}>
            <Sparkles size={12} color="#0051D5" />
            <Text style={styles.aiPillText}>AI Verified Sentinel System</Text>
          </View>
        </View>

        {/* Login Form Box */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>Sign In with Mobile</Text>
          <Text style={styles.cardSub}>Enter your registered mobile number to receive an OTP</Text>

          <View style={styles.inputRow}>
            <View style={styles.countryCodeBox}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="10-digit mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (error) setError('');
              }}
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSendOtp}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Get OTP Code</Text>
                <ArrowRight size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.seedNoteBox}>
            <Text style={styles.seedNoteTitle}>📱 Real OTP via SMS:</Text>
            <Text style={styles.seedNoteText}>Enter your mobile number to receive a real OTP via SMS powered by <Text style={styles.boldText}>Twilio Verify</Text>.</Text>
          </View>
        </View>

        {/* Footer Navigation to Signup */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account yet?</Text>
          <TouchableOpacity
            style={styles.signupLinkBtn}
            onPress={() => navigation.navigate('Signup')}
          >
            <UserPlus size={16} color="#0051D5" />
            <Text style={styles.signupLinkText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBanner: {
    backgroundColor: '#00152A',
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0051D5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoLetter: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 14,
  },
  aiPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0051D5',
  },
  cardContainer: {
    marginHorizontal: 20,
    marginTop: -28,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#102A43',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00152A',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: '#74777E',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countryCodeBox: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 10,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorContainer: {
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0051D5',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: '#0051D5',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  seedNoteBox: {
    marginTop: 20,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  seedNoteTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 2,
  },
  seedNoteText: {
    fontSize: 12,
    color: '#1E3A8A',
  },
  boldText: {
    fontWeight: '900',
    color: '#0051D5',
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 28,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  signupLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  signupLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0051D5',
  },
});
