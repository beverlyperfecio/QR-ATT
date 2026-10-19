
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
  Alert,
  StatusBar,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors';
import { signIn } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await signIn(
        email.trim(),
        password
      );

      if (authError) {
        setError(
          authError.message.toLowerCase().includes('invalid login credentials')
            ? 'Incorrect email or password. Please try again.'
            : authError.message
        );
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    Keyboard.dismiss();
    setError('');

    const userEmail = email.trim();

    if (!userEmail) {
      Alert.alert(
        'Forgot Password',
        'Please enter your email address first.'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setResetLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(userEmail);

      if (resetError) {
        Alert.alert('Unable to Send Email', resetError.message);
        return;
      }

      Alert.alert(
        'Check Your Email',
        'If an account exists for this email, a password reset link will be sent. Please check your inbox and spam folder.'
      );
    } catch (err: any) {
      Alert.alert(
        'Something Went Wrong',
        err?.message || 'Please try again later.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topSection}>
              <View style={styles.logoCircle}>
                <Ionicons
                  name="qr-code"
                  size={52}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.logoTitle}>QR ATTENDANCE</Text>


              <Text style={styles.subtitle}>
                Sign in to continue to your attendance.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.formTitle}>Sign In</Text>

              <Text style={styles.formSubtitle}>
                Enter your account details below.
              </Text>

              <Text style={styles.label}>Email Address</Text>

              <View
                style={[
                  styles.inputContainer,
                  emailFocused && styles.inputFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailFocused ? COLORS.primary : COLORS.textSecondary}
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading && !resetLoading}
                  returnKeyType="next"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>

              <Text style={styles.label}>Password</Text>

              <View
                style={[
                  styles.inputContainer,
                  passwordFocused && styles.inputFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={
                    passwordFocused ? COLORS.primary : COLORS.textSecondary
                  }
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !resetLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />

                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((previous) => !previous)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  hitSlop={10}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={COLORS.textSecondary}
                  />
                </Pressable>
              </View>

              <View style={styles.forgotRow}>
                <Pressable
                  onPress={handleForgotPassword}
                  disabled={loading || resetLoading}
                  hitSlop={8}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>
              </View>

              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={COLORS.danger}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.buttonPressed,
                  (loading || resetLoading) && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading || resetLoading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </Pressable>

              {resetLoading && (
                <View style={styles.resetStatus}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.resetStatusText}>
                    Sending reset link...
                  </Text>
                </View>
              )}

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>NEW HERE?</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.signupRow}>
                <Text style={styles.signupText}>
                  Don't have an account?
                </Text>
                <Link href="/register" style={styles.signupLink}>
                  Sign Up
                </Link>
              </View>
            </View>
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
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },

  topSection: {
    alignItems: 'center',
    marginBottom: 26,
  },

  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 40,
    backgroundColor: '#18373B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 14,
  },

  logoTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.primary,
    textAlign: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.6,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 290,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  formTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  formSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 12,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },

  inputFocused: {
    borderColor: COLORS.primary,
  },

  inputIcon: {
    marginLeft: 14,
  },

  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 14,
  },

  forgotText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 10,
    padding: 11,
    marginTop: 16,
    gap: 8,
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.danger,
  },

  loginButton: {
    minHeight: 54,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginTop: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  resetStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },

  resetStatusText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 25,
    marginBottom: 20,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },

  signupText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  signupLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 24,
  },

  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
