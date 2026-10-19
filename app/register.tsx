
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(
        email.trim(),
        password,
        {
          full_name: fullName.trim(),
          role,
        }
      );

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <View style={styles.logoCircle}>
                <Ionicons
                  name="qr-code"
                  size={52}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.logoTitle}>QR ATTENDANCE</Text>

              
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.title}>Create Account</Text>

              <Text style={styles.subtitle}>
                Register to start recording attendance
              </Text>
            </View>

            {success ? (
              <View style={styles.successContainer}>
                <Ionicons
                  name="mail-open-outline"
                  size={42}
                  color={COLORS.accent}
                  style={styles.successIcon}
                />

                <Text style={styles.successTitle}>
                  Check your email!
                </Text>

                <Text style={styles.successText}>
                  We sent a confirmation link to {email}. Click the
                  link to verify your account, then come back and sign in.
                </Text>

                <Link href="/login" style={styles.link}>
                  Back to Sign In
                </Link>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.label}>Full Name</Text>

                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor={COLORS.textSecondary}
                  editable={!loading}
                  autoCapitalize="words"
                />

                <Text style={styles.label}>I am a...</Text>

                <View style={styles.roleRow}>
                  <Pressable
                    style={[
                      styles.roleChip,
                      role === 'student' && styles.roleChipActive,
                    ]}
                    onPress={() => setRole('student')}
                    disabled={loading}
                  >
                    <Ionicons
                      name="person-outline"
                      size={19}
                      color={
                        role === 'student'
                          ? COLORS.primary
                          : COLORS.textSecondary
                      }
                    />

                    <Text
                      style={[
                        styles.roleChipText,
                        role === 'student' && styles.roleChipTextActive,
                      ]}
                    >
                      Student
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.roleChip,
                      role === 'teacher' && styles.roleChipActive,
                    ]}
                    onPress={() => setRole('teacher')}
                    disabled={loading}
                  >
                    <Ionicons
                      name="school-outline"
                      size={19}
                      color={
                        role === 'teacher'
                          ? COLORS.primary
                          : COLORS.textSecondary
                      }
                    />

                    <Text
                      style={[
                        styles.roleChipText,
                        role === 'teacher' && styles.roleChipTextActive,
                      ]}
                    >
                      Teacher
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.label}>Email</Text>

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@school.edu"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                />

                <Text style={styles.label}>Password</Text>

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />

                <Text style={styles.label}>Confirm Password</Text>

                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                  onSubmitEditing={handleRegister}
                  returnKeyType="done"
                />

                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={COLORS.danger}
                    />
                    <Text style={styles.error}>{error}</Text>
                  </View>
                )}

                {loading ? (
                  <ActivityIndicator
                    size="large"
                    color={COLORS.primary}
                    style={styles.loader}
                  />
                ) : (
                  <View style={styles.buttonContainer}>
                    <AppButton
                      theme="primary"
                      title="Create Account"
                      icon="person-add-outline"
                      onPress={handleRegister}
                    />
                  </View>
                )}
              </View>
            )}

            {!success && (
              <Link href="/login" style={styles.link}>
                Already have an account? Sign In
              </Link>
            )}

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },

  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 25,
  },

  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 40,
    backgroundColor: '#18373B',
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  logoTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.primary,
    textAlign: 'center',
  },

 
  titleContainer: {
    alignItems: 'center',
    width: '100%',
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
    textAlign: 'center',
  },

  form: {
    marginBottom: 24,
  },

  buttonContainer: {
    marginTop: 20,
  },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 7,
    marginTop: 14,
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },

  roleChip: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roleChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '1A',
  },

  roleChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  roleChipTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },

  error: {
    flex: 1,
    fontSize: 13,
    color: COLORS.danger,
  },

  loader: {
    marginVertical: 20,
  },

  link: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 8,
  },

  successContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 22,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },

  successIcon: {
    marginBottom: 12,
  },

  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },

  successText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },

  footerText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.65,
  },
});
