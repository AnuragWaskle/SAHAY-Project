import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { KeyRound, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { useAuth, UserProfile } from '../context/AuthContext';

export default function OtpScreen({ route, navigation }: any) {
  const { login } = useAuth();
  const { phone, name, email, ward, role, mode } = route.params || {};

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setError('');
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 4) {
      setError('Please enter the 4-digit OTP code');
      return;
    }

    if (cleanOtp !== '0000') {
      setError('Invalid OTP code. Please enter "0000" for verification.');
      return;
    }

    setLoading(true);

    try {
      let userProfile: UserProfile;

      if (mode === 'signup') {
        userProfile = {
          id: `user-${Date.now()}`,
          name: name || 'Citizen Sentinel',
          email: email || `${phone}@sahay.org`,
          phone: phone,
          role: role || 'citizen',
          ward: ward || 'Ward 12, Bhopal',
          city: 'Bhopal',
          xp: 100,
          level: 1,
          badges: ['New Sentinel'],
          civicCoins: 50,
        };
      } else {
        // Sign in mode: Seeded user or existing account
        if (phone === '9876543210' || !phone) {
          userProfile = {
            id: 'user-aryan-1',
            name: 'Aryan Sharma',
            email: 'aryan@sahay.org',
            phone: '9876543210',
            role: 'citizen',
            ward: 'Ward 12',
            city: 'Bhopal',
            xp: 1840,
            level: 7,
            badges: ['Pothole Hunter', 'Civic Leader'],
            civicCoins: 450,
          };
        } else {
          userProfile = {
            id: `user-${phone}`,
            name: `User (${phone.slice(-4)})`,
            email: `${phone}@sahay.org`,
            phone: phone,
            role: 'citizen',
            ward: 'Ward 12, Bhopal',
            city: 'Bhopal',
            xp: 350,
            level: 2,
            civicCoins: 100,
          };
        }
      }

      await login(userProfile, `token_${userProfile.id}`);
    } catch (err) {
      setError('Verification failed. Please try again.');
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

        <Text style={styles.titleText}>Enter 4-Digit Code</Text>
        <Text style={styles.subText}>
          Verification OTP sent to <Text style={styles.boldTarget}>+91 {phone || '9876543210'}</Text>
        </Text>

        <View style={styles.tipBanner}>
          <ShieldCheck size={16} color="#0051D5" />
          <Text style={styles.tipBannerText}>Master Demo OTP Code: <Text style={styles.otpCodeBold}>0000</Text></Text>
        </View>

        {/* OTP Input */}
        <TextInput
          style={styles.otpInput}
          placeholder="0000"
          placeholderTextColor="#CBD5E1"
          keyboardType="number-pad"
          maxLength={4}
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

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={() => {
            setOtp('0000');
            setError('');
          }}
        >
          <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendHighlight}>Auto-fill 0000</Text></Text>
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
    fontSize: 15,
  },
  otpInput: {
    width: 200,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0051D5',
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 12,
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
    padding: 8,
  },
  resendText: {
    fontSize: 13,
    color: '#64748B',
  },
  resendHighlight: {
    color: '#0051D5',
    fontWeight: '800',
  },
});
