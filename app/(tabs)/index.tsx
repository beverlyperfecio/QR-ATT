
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';

type MenuItemProps = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function MenuItem({
  title,
  description,
  icon,
  onPress,
}: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.menuIcon}>
        <Ionicons
          name={icon}
          size={22}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={22}
        color={COLORS.textSecondary}
      />
    </Pressable>
  );
}

export default function Index() {
  const { user } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const loadRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setRoleLoading(false);
      return;
    }

    setRoleLoading(true);

    try {
      const profile = await getProfile(user.id);
      setRole(profile?.role ?? 'student');
    } catch (error) {
      console.error('Failed to load user role:', error);
      setRole(null);
    } finally {
      setRoleLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadRole();
    }, [loadRole])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="qr-code"
              size={52}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.title}>QR ATTENDANCE</Text>
          
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.tag}>
            <View style={styles.statusDot} />
            <Text style={styles.tagText}>
              ATTENDANCE SYSTEM
            </Text>
          </View>

          <Text style={styles.mainTitle}>
            School Event{'\n'}Attendance
          </Text>

          <Text style={styles.subtitle}>
            Manage your attendance easily by scanning
            the QR code provided for each school event.
          </Text>
        </View>

        <View style={styles.menuCard}>
          <MenuItem
            title="Scan QR Code"
            description="Record your event attendance"
            icon="qr-code-outline"
            onPress={() => router.push('/scan')}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            title="Attendance History"
            description="View your previous attendance"
            icon="time-outline"
            onPress={() => router.push('/history')}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            title="My Profile"
            description="Manage your account information"
            icon="person-outline"
            onPress={() => router.push('/profile')}
          />

          {!roleLoading && role === 'teacher' && (
            <>
              <View style={styles.menuDivider} />

              <MenuItem
                title="Teacher Dashboard"
                description="Create events and generate QR codes"
                icon="school-outline"
                onPress={() => router.push('/teacher')}
              />
            </>
          )}

          {roleLoading && (
            <ActivityIndicator
              color={COLORS.primary}
              style={styles.roleLoader}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },

  header: {
    alignItems: 'center',
    marginBottom: 14,
  },

  iconCircle: {
    width: 94,
    height: 94,
    borderRadius: 40,
    backgroundColor: '#18373B',
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  byline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  welcomeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 16,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 7,
  },

  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },

  mainTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surface,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 17,
    paddingHorizontal: 4,
    gap: 12,
  },

  menuItemPressed: {
    opacity: 0.65,
  },

  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuText: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  menuDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  menuDivider: {
    height: 1,
    backgroundColor: COLORS.surface,
    marginLeft: 4,
  },

  roleLoader: {
    marginVertical: 14,
  },
});
