import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="school-outline"
              size={52}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.title}>QR Attendance</Text>
          <Text style={styles.byline}>by: Beverly Perfecio</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.mainTitle}>School Event Attendance</Text>

          <Text style={styles.subtitle}>
            Scan QR Codes to record attendance during school activities.
          </Text>
        </View>

        <View style={styles.buttons}>
          <AppButton
            theme="primary"
            title="Scan QR Code"
            icon="qr-code-outline"
            onPress={() => router.push('/scan')}
          />

          <AppButton
            title="Attendance History"
            icon="time-outline"
            onPress={() => router.push('/history')}
          />

          <AppButton
            title="Profile"
            icon="person-outline"
            onPress={() => router.push('/profile')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
    
  },

  header: {
    alignItems: 'center',
    marginTop: 20,
  },

  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  byline: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  body: {
  alignItems: 'center',
  transform: [{ translateY: 40}],
},

  mainTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 10,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  buttons: {
  width: '100%',
  alignItems: 'center',
  gap: 5,
},
});