import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';

export default function TabLayout() {
  const { user } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const loadRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setLoadingRole(false);
      return;
    }

    setLoadingRole(true);

    try {
      const profile = await getProfile(user.id);

      const userRole = String(profile?.role ?? 'student')
        .trim()
        .toLowerCase();

      setRole(userRole);
    } catch (error) {
      console.error('Failed to load user role:', error);
      setRole('student');
    } finally {
      setLoadingRole(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadRole();
    }, [loadRole]),
  );

  if (loadingRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  const isTeacher = role === 'teacher';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,

        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },

        tabBarStyle: {
          height: 76,
          paddingTop: 9,
          backgroundColor: 'hsla(213, 37%, 24%, 0.96)',
          borderTopWidth: 0,
          borderTopColor: COLORS.border,
          shadowColor: COLORS.shadow,
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.12,
          shadowRadius: 0,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home-sharp' : 'home-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          href: isTeacher ? null : '/scan',
          tabBarIcon: ({ focused }) => (
            <View style={styles.scanButton}>
              <Ionicons
                name={focused ? 'qr-code' : 'qr-code-outline'}
                color={COLORS.textOnPrimary}
                size={28}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Teacher',
          href: isTeacher ? '/teacher' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'clipboard' : 'clipboard-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -27,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 3,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 7,
  },
});