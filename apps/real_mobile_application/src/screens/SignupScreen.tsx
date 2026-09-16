import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet
} from 'react-native';
import { ArrowRight, UserCheck, Shield, Building2, User } from 'lucide-react-native';

export default function SignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [ward, setWard] = useState('Ward 12, Bhopal');
  const [role, setRole] = useState<'citizen' | 'ngo'>('citizen');
  const [error, setError] = useState('');

  const handleRegister = () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    navigation.navigate('Otp', {
      phone: cleanPhone,
      name: name.trim(),
      email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '')}@sahay.org`,
      ward: ward.trim() || 'Ward 12, Bhopal',
      role,
      mode: 'signup'
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerBanner}>
          <Text style={styles.headerBadge}>JOIN THE SENTINEL NETWORK</Text>
          <Text style={styles.brandTitle}>Create Account</Text>
          <Text style={styles.brandSubtitle}>Empower your community with Sahay Civic Intelligence</Text>
        </View>

        {/* Card Form */}
        <View style={styles.cardContainer}>
          {/* Full Name */}
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.inputField}
            placeholder="e.g. Aryan Sharma"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError('');
            }}
          />

          {/* Mobile Number */}
          <Text style={styles.inputLabel}>Mobile Phone</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+91</Text>
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

          {/* Email */}
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.inputField}
            placeholder="aryan@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          {/* Ward / Location */}
          <Text style={styles.inputLabel}>Ward / City</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Ward 12, Bhopal"
            placeholderTextColor="#9CA3AF"
            value={ward}
            onChangeText={setWard}
          />

          {/* Role Picker */}
          <Text style={styles.inputLabel}>Account Type</Text>
          <View style={styles.rolePickerRow}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'citizen' && styles.roleCardActive]}
              onPress={() => setRole('citizen')}
              activeOpacity={0.8}
            >
              <User size={20} color={role === 'citizen' ? '#0051D5' : '#64748B'} />
              <Text style={[styles.roleTitle, role === 'citizen' && styles.roleTitleActive]}>Citizen</Text>
              <Text style={styles.roleDesc}>Report & Track Issues</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === 'ngo' && styles.roleCardActive]}
              onPress={() => setRole('ngo')}
              activeOpacity={0.8}
            >
              <Building2 size={20} color={role === 'ngo' ? '#0051D5' : '#64748B'} />
              <Text style={[styles.roleTitle, role === 'ngo' && styles.roleTitleActive]}>NGO Rep</Text>
              <Text style={styles.roleDesc}>Run Civic Projects</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>Verify via OTP</Text>
            <ArrowRight size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already registered?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signinLinkText}>Sign In Here</Text>
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
    paddingBottom: 40,
  },
  headerBanner: {
    backgroundColor: '#00152A',
    paddingTop: 54,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  cardContainer: {
    marginHorizontal: 20,
    marginTop: -24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#102A43',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prefixBox: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  roleCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0051D5',
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  roleTitleActive: {
    color: '#0051D5',
  },
  roleDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  errorContainer: {
    marginTop: 14,
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
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 22,
    shadowColor: '#0051D5',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  signinLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0051D5',
  },
});
