import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyRound, CheckCircle2, ArrowLeft, ShieldCheck, RotateCcw } from 'lucide-react-native';
import { useAuth, UserProfile } from '../context/AuthContext';
import apiClient from '../api/client';
import { setAuthToken } from '../api/client';

export default function OtpScreen({ route, navigation }: any) {
  const { login } = useAuth();
  const { phone, name, email, ward, role, mode } = route.params || {};

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30); // 30s cooldown before resend
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown on mount
  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await apiClient.post('/auth/send-otp', { phone });
      startCountdown();
      Alert.alert('OTP Resent', `A new OTP has been sent to +91 ${phone}`);
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Failed to resend OTP. Please try again.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 4) {
      setError('Please enter the OTP code you received via SMS');
      return;
    }

    setLoading(true);
    try {
      // Call the real backend to verify OTP via Twilio
      const response = await apiClient.post('/auth/verify-otp', {
        phone,
        code: cleanOtp,
        // Pass signup info when creating a new account
        ...(mode === 'signup' && {
          name: name || undefined,
          email: email || undefined,
          role: role || 'citizen',
        }),
      });

      const { token, user } = response.data.data;

      // Set the auth token immediately so subsequent API calls are authenticated
      setAuthToken(token);

      // Build the UserProfile from the backend response
      const userProfile: UserProfile = {
        id: user.id,
        name: user.name || `Citizen ${phone.slice(-4)}`,
        email: user.email || `${phone}@sahay.org`,
        phone: user.phone || phone,
        role: user.role || 'citizen',
        ward: ward || 'Bhopal',
        city: 'Bhopal',
        xp: user.civic_impact_score || 0,
        level: user.level || 1,
        badges: [],
        civicCoins: user.civic_credits || 0,
      };

      // Login with real user data + real token from backend
      await login(userProfile, token);
    } catch (e: any) {
      console.warn('[OtpScreen] Verify error:', e);
      const msg =
        e.response?.data?.error ||
        e.userMessage ||
        'OTP verification failed. Please check the code and try again.';
      setError(msg);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OTP Verification</Text>
      </View>

      <View style={styles.contentBox}>
        <View style={styles.iconCircle}>
          <KeyRound size={36} color="#0051D5" />
        </View>

        <Text style={styles.titleText}>Enter Your OTP</Text>
        <Text style={styles.subText}>
          We sent a verification code to{' '}
          <Text style={styles.boldTarget}>+91 {phone}</Text>
        </Text>

        <View style={styles.tipBanner}>
          <ShieldCheck size={16} color="#0051D5" />
          <Text style={styles.tipBannerText}>
            Real SMS sent via <Text style={styles.otpCodeBold}>Twilio Verify</Text>
          </Text>
        </View>

        {/* OTP Input */}
        <TextInput
          style={styles.otpInput}
          placeholder="------"
          placeholderTextColor="#CBD5E1"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={(val) => {
            setOtp(val);
            if (error) setError('');
          }}
          autoFocus
        />

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <CheckCircle2 size={20} color="#FFF" />
              <Text style={styles.verifyBtnText}>Verify & Sign In</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Resend OTP */}
        <TouchableOpacity
          style={[styles.resendBtn, (countdown > 0 || resending) && { opacity: 0.5 }]}
          onPress={handleResendOtp}
          disabled={countdown > 0 || resending}
        >
          {resending ? (
            <ActivityIndicator size="small" color="#0051D5" />
          ) : (
            <View style={styles.resendRow}>
              <RotateCcw size={14} color="#0051D5" />
              <Text style={styles.resendText}>
                {countdown > 0
                  ? `Resend OTP in ${countdown}s`
                  : "Didn't receive it? Resend OTP"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  headerBar: {
    height: 60,
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  contentBox: {
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  boldTarget: {
    fontWeight: '800',
    color: '#0F172A',
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 24,
  },
  tipBannerText: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  otpCodeBold: {
    fontWeight: '900',
    color: '#0051D5',
    fontSize: 13,
  },
  otpInput: {
    width: 220,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0051D5',
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 16,
    shadowColor: '#0051D5',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  verifyBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0051D5',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#0051D5',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resendBtn: {
    marginTop: 20,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendText: {
    fontSize: 13,
    color: '#0051D5',
    fontWeight: '700',
  },
});
