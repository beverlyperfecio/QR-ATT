import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const processing = useRef(false);

  const processQRCode = async (data: string) => {
    if (processing.current || !data.trim()) return;

    processing.current = true;
    setScanned(true);
    setLoading(true);
    setLastData(data);
    setMessage(null);
    setSuccess(false);

    try {
      if (!user?.id) {
        setMessage('Please log in before recording attendance.');
        return;
      }

      const result = await registerAttendance(data, user.id);

      setMessage(result.message);
      setSuccess(result.success);
    } catch (error) {
      console.error('Attendance registration error:', error);
      setMessage('Unable to record attendance. Please try again.');
      setSuccess(false);
    } finally {
      setLoading(false);
      processing.current = false;
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    void processQRCode(data);
  };

  const resetScan = () => {
    if (processing.current) return;

    setScanned(false);
    setLastData(null);
    setMessage(null);
    setSuccess(false);
    setLoading(false);
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons
          name="camera-outline"
          size={56}
          color={COLORS.primary}
        />

        <Text style={styles.title}>
          Camera Permission Needed
        </Text>

        <Text style={styles.subtitle}>
          Allow camera access to scan school event QR codes.
        </Text>

        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={
            loading || processing.current
              ? undefined
              : handleBarcodeScanned
          }
        />
      )}

      <View style={styles.topHeader}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="qr-code"
            size={24}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.headerTitle}>
          QR Attendance
        </Text>

        <Text style={styles.headerSubtitle}>
          Scan the event QR code to record your attendance
        </Text>
      </View>

      {!scanned && (
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text style={styles.instruction}>
            Place the QR code inside the frame
          </Text>
        </View>
      )}

      <View style={styles.bottomCard}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text style={styles.loadingText}>
              Recording attendance...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statusRow}>
              <Ionicons
                name={
                  success
                    ? 'checkmark-circle'
                    : message
                      ? 'alert-circle'
                      : 'scan-outline'
                }
                size={25}
                color={
                  success
                    ? COLORS.success
                    : message
                      ? COLORS.danger
                      : COLORS.primary
                }
              />

              <Text style={styles.statusTitle}>
                {success
                  ? 'Attendance Recorded'
                  : message
                    ? 'Scan Result'
                    : 'Ready to Scan'}
              </Text>
            </View>

            <Text style={styles.resultText}>
              {message ||
                'Point your camera at a school event QR code to record your attendance.'}
            </Text>

            {lastData && (
              <Text
                style={styles.codeText}
                numberOfLines={3}
              >
                QR Data: {lastData}
              </Text>
            )}

            {scanned && (
              <AppButton
                theme="primary"
                title="Scan Again"
                icon="refresh"
                onPress={resetScan}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171923',
    justifyContent: 'space-between',
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },

  topHeader: {
    alignItems: 'center',
    paddingTop: 58,
    paddingHorizontal: 24,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  headerSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#D1D5DB',
    textAlign: 'center',
    marginTop: 7,
  },

  scanFrameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: '#FFFFFF',
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 14,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 14,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 14,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 14,
  },

  instruction: {
    color: '#E5E7EB',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 18,
  },

  bottomCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 30,
    gap: 14,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  statusTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  resultText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },

  codeText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  loadingRow: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },

  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});