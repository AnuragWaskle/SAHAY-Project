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
  Image,
  ActivityIndicator
} from 'react-native';
import { Shield, User, Lock, Eye, EyeOff, ArrowRight, UserPlus, Sparkles } from 'lucide-react-native';
import { useAuth, UserProfile } from '../context/AuthContext';

const SAHAY_LOGO = require('../../assets/images/sahay-logo.png');

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('9876543210');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError('');
    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId) {
      setError('Please enter your username, email, or mobile number');
      return;
    }
    if (!cleanPass) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      let userProfile: UserProfile;

      // Seeded demo account check
      if (cleanId === '9876543210' || cleanId.toLowerCase() === 'aryan' || cleanId.toLowerCase() === 'aryan@sahay.org') {
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
        // Any other user signing in with credentials
        const isEmail = cleanId.includes('@');
        const isPhone = /^\d+$/.test(cleanId);

        userProfile = {
          id: `user-${Date.now()}`,
          name: isEmail ? cleanId.split('@')[0] : cleanId,
          email: isEmail ? cleanId : `${cleanId.toLowerCase().replace(/\s+/g, '')}@sahay.org`,
          phone: isPhone ? cleanId : '9876543210',
          role: 'citizen',
          ward: 'Ward 12, Bhopal',
          city: 'Bhopal',
          xp: 100,
          level: 1,
          badges: ['New Sentinel'],
          civicCoins: 50,
        };
      }

      await login(userProfile, `token_${userProfile.id}`);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
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
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Enter your username / mobile and password to continue</Text>

          {/* Username / Mobile Field */}
          <Text style={styles.inputLabel}>Username, Email, or Mobile</Text>
          <View style={styles.inputWrapper}>
            <User size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Username, Email, or Mobile"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (error) setError('');
              }}
            />
          </View>

          {/* Password Field */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <Lock size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Enter password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              {showPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Sign In</Text>
                <ArrowRight size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.seedNoteBox}>
            <Text style={styles.seedNoteTitle}>💡 Demo Account Credentials:</Text>
            <Text style={styles.seedNoteText}>
              Username: <Text style={styles.boldText}>9876543210</Text> | Password: <Text style={styles.boldText}>password123</Text>
            </Text>
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 6,
  },
  errorContainer: {
    marginTop: 12,
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

