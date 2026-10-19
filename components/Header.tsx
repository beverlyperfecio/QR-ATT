import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = { title: string };

export default function Header({ title }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Ionicons name="qr-code" size={43} color="#EFBC13" />
      </View>

      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  logoCircle: {
    width: 85,
    height: 85,
    borderRadius: 50,
    backgroundColor: '#18373B',
    borderWidth: 1,
    borderColor: '#D2DDF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});