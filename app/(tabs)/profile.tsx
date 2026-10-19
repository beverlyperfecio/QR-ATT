
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const router = useRouter();

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const p = await getProfile(user.id);
      setProfile(p);
      setDraftName(p?.full_name ?? '');
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user || saving) return;

    const name = draftName.trim();

    if (!name) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: name,
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setProfile((previous) =>
        previous ? { ...previous, full_name: name } : previous
      );

      setDraftName(name);
      setEditing(false);
      Alert.alert('Success', 'Your profile name has been updated.');
    } catch {
      Alert.alert('Error', 'Could not update your name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftName(profile?.full_name ?? '');
    setEditing(false);
  };

const handleSignOut = async () => {
  setLoading(true);

  try {
    await signOut();
    router.replace('/login');
  } catch (err: any) {
    Alert.alert(
      'Error',
      err?.message || 'Failed to sign out.'
    );
  } finally {
    setLoading(false);
  }
};


  const isTeacher = profile?.role === 'teacher';
  const displayName = profile?.full_name?.trim() || 'User';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>My Profile</Text>
      <Text style={styles.pageSubtitle}>
        Manage your account information
      </Text>

      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          {initials ? (
            <Text style={styles.avatarText}>{initials}</Text>
          ) : (
            <Ionicons
              name="person"
              size={34}
              color={COLORS.background}
            />
          )}
        </View>

        <Text style={styles.profileName}>{displayName}</Text>

        <Text style={styles.profileEmail}>
          {user?.email || 'No email available'}
        </Text>

        <View
          style={[
            styles.roleBadge,
            isTeacher ? styles.teacherBadge : styles.studentBadge,
          ]}
        >
          <Ionicons
            name={isTeacher ? 'school-outline' : 'person-outline'}
            size={14}
            color={COLORS.background}
          />
          <Text style={styles.roleBadgeText}>
            {isTeacher ? 'Teacher' : 'Student'}
          </Text>
        </View>
      </View>


      <View style={styles.sectionHeader}>
        <Ionicons
          name="person-circle-outline"
          size={22}
          color={COLORS.primary}
        />
        <Text style={styles.sectionTitle}>Personal Information</Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>Full Name</Text>

          {!editing && (
            <Pressable
              onPress={() => setEditing(true)}
              style={styles.editButton}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          )}
        </View>

        {editing ? (
          <>
            <TextInput
              style={styles.nameInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textPrimary}
              autoCapitalize="words"
              editable={!saving}
              maxLength={100}
            />

            <View style={styles.actionRow}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleCancelEdit}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={handleSaveName}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.background}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-outline"
                      size={17}
                      color={COLORS.background}
                    />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.value}>{displayName}</Text>
        )}

        <View style={styles.separator} />

        <Text style={styles.label}>Email Address</Text>
        <View style={styles.detailRow}>
          <Ionicons
            name="mail-outline"
            size={19}
            color={COLORS.primary}
          />
          <Text style={styles.value} selectable>
            {user?.email || 'Not available'}
          </Text>
        </View>

        <View style={styles.separator} />

        <Text style={styles.label}>Account Role</Text>
        <View style={styles.detailRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={19}
            color={COLORS.primary}
          />
          <Text style={styles.value}>
            {profile?.role
              ? profile.role.charAt(0).toUpperCase() +
                profile.role.slice(1)
              : 'Student'}
          </Text>
        </View>

        <View style={styles.separator} />

        <Text style={styles.label}>User ID</Text>
        <View style={styles.userIdBox}>
          <Ionicons
            name="finger-print-outline"
            size={19}
            color={COLORS.primary}
          />
          <Text style={styles.userId} selectable>
            {user?.id || 'Not available'}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Ionicons
          name="settings-outline"
          size={22}
          color={COLORS.primary}
        />
        <Text style={styles.sectionTitle}>Account Settings</Text>
      </View>

      <View style={styles.signOutCard}>
        <View style={styles.signOutInfo}>
          <View style={styles.signOutIcon}>
            <Ionicons
              name="log-out-outline"
              size={22}
             color="#ff0202"
            />
          </View>

          <View style={styles.signOutTextContainer}>
            <Text style={styles.signOutTitle}>Sign Out</Text>
            <Text style={styles.signOutSubtitle}>
              Sign out of your current account
            </Text>
          </View>
        </View>

        <AppButton
        title="Sign Out"
        icon="log-out-outline"
        onPress={handleSignOut}
        disabled={loading}
        />
        
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textPrimary,
    marginTop: 12,
    fontSize: 14,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    opacity: 0.8,
    marginBottom: 22,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    marginBottom: 26,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: COLORS.textOnPrimary,
  },
  avatarText: {
    color: COLORS.background,
    fontSize: 27,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textPrimary,
    opacity: 0.8,
    marginTop: 5,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginTop: 13,
  },
  teacherBadge: {
    backgroundColor: COLORS.primary,
  },
  studentBadge: {
    backgroundColor: COLORS.accent,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.background,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 26,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 7,
  },
  value: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 5,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  nameInput: {
    backgroundColor: COLORS.background,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginBottom: 8,
  },
  cancelButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.45,
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userIdBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
  },
  userId: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textPrimary,
  },
  signOutCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 15,
  },
  signOutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutTextContainer: {
    flex: 1,
  },
  signOutTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  signOutSubtitle: {
    fontSize: 12,
    color: COLORS.textPrimary,
    opacity: 0.75,
    marginTop: 3,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textPrimary,
    opacity: 0.55,
    fontSize: 12,
    marginTop: 24,
  },
});
