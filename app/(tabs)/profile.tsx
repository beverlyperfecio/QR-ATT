import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

const UI = {
  background: '#101827',
  card: '#1B2638',
  cardAlt: '#202F46',
  border: '#354258',
  text: '#F1F5F9',
  muted: '#A7B4C7',
  yellow: '#EFBC13',
  green: '#20C997',
  red: '#EF6464',
  blue: '#58A6FF',
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadProfile = async () => {
        if (!user) {
          if (active) {
            setProfile(null);
            setDraftName('');
          }
          return;
        }

        try {
          const result = await getProfile(user.id);

          if (active) {
            setProfile(result);
            setDraftName(result?.full_name ?? '');
          }
        } catch (error) {
          console.error('Failed to load profile:', error);

          if (active) {
            Alert.alert(
              'Unable to Load Profile',
              'Please check your connection and try again.',
            );
          }
        }
      };

      void loadProfile();

      return () => {
        active = false;
      };
    }, [user]),
  );

  const handleSaveName = async () => {
    if (!user || saving) return;

    const name = draftName.trim();

    if (!name) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }

    if (name.length < 2) {
      Alert.alert(
        'Invalid Name',
        'Your name must have at least 2 characters.',
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: name,
      });

      if (error) {
        Alert.alert('Update Failed', error);
        return;
      }

      setProfile((previous) =>
        previous ? { ...previous, full_name: name } : previous,
      );

      setDraftName(name);
      setEditing(false);

      Alert.alert(
        'Changes Saved',
        'Your profile name has been updated.',
      );
    } catch (error) {
      console.error('Failed to update profile:', error);

      Alert.alert(
        'Update Failed',
        'Unable to update your name. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftName(profile?.full_name ?? '');
    setEditing(false);
  };

  // Direct sign-out without a confirmation popup.
  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to sign out. Please try again.';

      Alert.alert('Sign Out Failed', message);
    } finally {
      setSigningOut(false);
    }
  };

  const normalizedRole = String(profile?.role ?? 'student')
    .trim()
    .toLowerCase();

  const isTeacher = normalizedRole === 'teacher';
  const displayName = profile?.full_name?.trim() || 'User';
  const roleLabel = isTeacher ? 'Teacher' : 'Student';

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={UI.background}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>ACCOUNT MANAGEMENT</Text>
              <Text style={styles.pageTitle}>My Profile</Text>
              <Text style={styles.pageSubtitle}>
                Manage your personal details and account.
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="person-outline"
                size={24}
                color={UI.yellow}
              />
            </View>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.profileTopLine} />

            <View style={styles.profileContent}>
              <View style={styles.identityRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initials || 'U'}
                  </Text>
                </View>

                <View style={styles.identityInfo}>
                  <Text style={styles.identityCaption}>
                    ACCOUNT PROFILE
                  </Text>

                  <Text style={styles.profileName} numberOfLines={2}>
                    {displayName}
                  </Text>

                  <Text style={styles.profileEmail} numberOfLines={2}>
                    {user?.email || 'Email unavailable'}
                  </Text>
                </View>
              </View>

              <View style={styles.profileDivider} />

              <View style={styles.profileFooter}>
                <View
                  style={[
                    styles.roleBadge,
                    isTeacher
                      ? styles.teacherBadge
                      : styles.studentBadge,
                  ]}
                >
                  <Ionicons
                    name={isTeacher ? 'school-outline' : 'person-outline'}
                    size={15}
                    color={UI.background}
                  />
                  <Text style={styles.roleBadgeText}>
                    {roleLabel} Account
                  </Text>
                </View>

                <View style={styles.activeStatus}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Signed in</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="person-circle-outline"
                size={21}
                color={UI.yellow}
              />
            </View>

            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>
                Personal Information
              </Text>
              <Text style={styles.sectionSubtitle}>
                Your registered account details
              </Text>
            </View>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.fieldHeading}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>

              {!editing && (
                <Pressable
                  onPress={() => {
                    setDraftName(profile?.full_name ?? '');
                    setEditing(true);
                  }}
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit full name"
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={UI.yellow}
                  />
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
              )}
            </View>

            {editing ? (
              <View style={styles.editPanel}>
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Enter your full name"
                  placeholderTextColor={UI.muted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!saving}
                  maxLength={100}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSaveName()}
                />

                <View style={styles.editActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleCancelEdit}
                    disabled={saving}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.saveButton,
                      saving && styles.disabledButton,
                    ]}
                    onPress={() => void handleSaveName()}
                    disabled={saving}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="checkmark-outline"
                      size={18}
                      color={UI.background}
                    />
                    <Text style={styles.saveText}>Save Changes</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.valueRow}>
                <View style={styles.valueIcon}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={UI.blue}
                  />
                </View>
                <Text style={styles.valueText}>{displayName}</Text>
              </View>
            )}

            <View style={styles.separator} />

            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>

            <View style={styles.valueRow}>
              <View style={styles.valueIcon}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={UI.blue}
                />
              </View>
              <Text style={styles.valueText} selectable>
                {user?.email || 'Not available'}
              </Text>
            </View>

            <View style={styles.separator} />

            <Text style={styles.fieldLabel}>ACCOUNT ROLE</Text>

            <View style={styles.valueRow}>
              <View style={styles.valueIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={UI.green}
                />
              </View>

              <View style={styles.roleInfo}>
                <Text style={styles.valueText}>{roleLabel}</Text>
                <Text style={styles.helperText}>
                  Your role determines the features available in the app.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="finger-print-outline"
                size={21}
                color={UI.yellow}
              />
            </View>

            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>
                Account Identification
              </Text>
              <Text style={styles.sectionSubtitle}>
                Your unique system identifier
              </Text>
            </View>
          </View>

          <View style={styles.idCard}>
            <View style={styles.idIcon}>
              <Ionicons
                name="key-outline"
                size={21}
                color={UI.yellow}
              />
            </View>

            <View style={styles.idContent}>
              <Text style={styles.fieldLabel}>USER ID</Text>
              <Text style={styles.userId} selectable>
                {user?.id || 'Not available'}
              </Text>
              <Text style={styles.helperText}>
                Used to identify your account in the attendance system.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="settings-outline"
                size={21}
                color={UI.yellow}
              />
            </View>

            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Account Settings</Text>
              <Text style={styles.sectionSubtitle}>
                Manage your current session
              </Text>
            </View>
          </View>

          <View style={styles.signOutCard}>
            <View style={styles.signOutRow}>
              <View style={styles.signOutIcon}>
                <Ionicons
                  name="log-out-outline"
                  size={23}
                  color={UI.red}
                />
              </View>

              <View style={styles.signOutCopy}>
                <Text style={styles.signOutTitle}>Sign Out</Text>
                <Text style={styles.signOutDescription}>
                  Securely end your current session on this device.
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            <Pressable
              onPress={() => void handleSignOut()}
              disabled={signingOut}
              hitSlop={10}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && styles.pressed,
                signingOut && styles.disabledButton,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign out of account"
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color={UI.red}
              />

              <Text style={styles.signOutButtonText}>
                {signingOut ? 'Signing Out...' : 'Sign Out of Account'}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={UI.muted}
              />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: UI.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 24,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: UI.yellow,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 7,
  },
  pageTitle: {
    color: UI.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    color: UI.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: UI.card,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: 'hidden',
    marginBottom: 28,
  },
  profileTopLine: {
    height: 4,
    backgroundColor: UI.yellow,
  },
  profileContent: {
    padding: 19,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 21,
    backgroundColor: UI.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: UI.background,
    fontSize: 24,
    fontWeight: '900',
  },
  identityInfo: {
    flex: 1,
  },
  identityCaption: {
    color: UI.yellow,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  profileName: {
    color: UI.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  profileEmail: {
    color: UI.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  profileDivider: {
    height: 1,
    backgroundColor: UI.border,
    marginVertical: 18,
  },
  profileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  teacherBadge: {
    backgroundColor: UI.yellow,
  },
  studentBadge: {
    backgroundColor: UI.green,
  },
  roleBadgeText: {
    color: UI.background,
    fontSize: 11,
    fontWeight: '800',
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: UI.green,
  },
  activeText: {
    color: UI.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 13,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: UI.muted,
    fontSize: 11,
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: UI.card,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 17,
    marginBottom: 28,
  },
  fieldHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabel: {
    color: UI.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 9,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: UI.cardAlt,
    marginBottom: 5,
  },
  editButtonText: {
    color: UI.yellow,
    fontSize: 12,
    fontWeight: '800',
  },
  editPanel: {
    backgroundColor: UI.background,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 13,
    padding: 12,
  },
  nameInput: {
    minHeight: 48,
    backgroundColor: UI.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.yellow,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: UI.text,
    fontSize: 14,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  cancelButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: UI.text,
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: UI.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  saveText: {
    color: UI.background,
    fontSize: 12,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 38,
  },
  valueIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: UI.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    flex: 1,
    color: UI.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: UI.border,
    marginVertical: 17,
  },
  roleInfo: {
    flex: 1,
  },
  helperText: {
    color: UI.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  idCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 19,
    padding: 17,
    marginBottom: 28,
  },
  idIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: UI.cardAlt,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idContent: {
    flex: 1,
  },
  userId: {
    color: UI.text,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: '600',
  },
  signOutCard: {
    backgroundColor: UI.card,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 17,
    marginBottom: 20,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 100, 100, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 100, 100, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutCopy: {
    flex: 1,
  },
  signOutTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
  },
  signOutDescription: {
    color: UI.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  signOutButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: UI.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(239, 100, 100, 0.5)',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 3,
  },
  signOutButtonText: {
    flex: 1,
    color: UI.red,
    fontSize: 13,
    fontWeight: '800',
  },
});