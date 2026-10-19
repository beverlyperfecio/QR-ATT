import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { createEvent } from '@/lib/events';
import { buildQRPayload } from '@/lib/qr';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

const THEME = {
  background: '#101827',
  card: '#192438',
  cardLight: '#202E45',
  border: '#34435B',
  yellow: '#F4C542',
  green: '#35D39A',
  text: '#F4F7FC',
  muted: '#9BAAC0',
  white: '#FFFFFF',
};

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });

  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} · ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = 'start' | 'end';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');

  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');

  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAndroid = Platform.OS === 'android';

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRole(null);
        setRoleLoading(false);

        return () => {
          active = false;
        };
      }

      setRoleLoading(true);

      getProfile(user.id)
        .then((profile) => {
          if (active) setRole(profile?.role ?? 'student');
        })
        .catch(() => {
          if (active) setRole('student');
        })
        .finally(() => {
          if (active) setRoleLoading(false);
        });

      return () => {
        active = false;
      };
    }, [user])
  );

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);

    if (isAndroid && editingPart === 'date') {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );

      if (editTarget === 'start') setStartDate(next);
      else setEndDate(next);

      setEditingPart('time');
      return;
    }

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (editTarget === 'start') setStartDate(next);
    else setEndDate(next);

    setEditTarget(null);
    setEditingPart('date');
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const handleCreateEvent = async () => {
    if (saving) return;

    const event = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    if (!event.eventId || !event.title) {
      setMessage('Event title and code are required.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('End time must be after start time.');
      return;
    }

    setSaving(true);
    setMessage(null);
    setPayload(null);

    try {
      const { error } = await createEvent(event);

      if (error) {
        setMessage('Could not save the event. Please try again.');
        return;
      }

      setPayload(buildQRPayload(event));
      setMessage('Event saved! Your QR code is ready.');
    } catch {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return (
      <View style={styles.center}>
        <View style={styles.statusIcon}>
          <Ionicons name="calendar-outline" size={32} color={THEME.yellow} />
        </View>
        <Text style={styles.statusTitle}>Loading</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.center}>
        <View style={styles.statusIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={34}
            color={THEME.yellow}
          />
        </View>
        <Text style={styles.statusTitle}>Teachers Only</Text>
        <Text style={styles.statusSubtitle}>
          Only teacher accounts can create events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="qr-code" size={29} color={THEME.yellow} />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.headerEyebrow}>QR ATTENDANCE</Text>
          <Text style={styles.headerTitle}>Create Event</Text>
        </View>

        <View style={styles.headerBadge}>
          <Ionicons name="shield-checkmark" size={17} color={THEME.green} />
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="clipboard-outline"
              size={22}
              color={THEME.yellow}
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>Event Information</Text>
            <Text style={styles.sectionSmall}>EVENT SETUP</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>EVENT TITLE</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="text-outline" size={19} color={THEME.yellow} />
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Founders Day Assembly"
            placeholderTextColor={THEME.muted}
            returnKeyType="next"
          />
        </View>

        <Text style={styles.label}>EVENT CODE</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="key-outline" size={19} color={THEME.yellow} />
          <TextInput
            style={styles.input}
            value={eventId}
            onChangeText={setEventId}
            placeholder="e.g. EVT-2026-0002"
            placeholderTextColor={THEME.muted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.label}>START DATE & TIME</Text>
        <PickerField
          value={formatDateTime(startDate)}
          icon="calendar-outline"
          onPress={() => openPicker('start')}
        />

        <Text style={styles.label}>END DATE & TIME</Text>
        <PickerField
          value={formatDateTime(endDate)}
          icon="calendar-outline"
          onPress={() => openPicker('end')}
        />

        <View style={styles.quickSection}>
          <View style={styles.quickHeader}>
            <Ionicons name="time-outline" size={18} color={THEME.green} />
            <Text style={styles.quickTitle}>QUICK END TIME</Text>
          </View>

          <View style={styles.chipRow}>
            {QUICK_END_OPTIONS.map((option) => {
              const selected =
                endDate.getTime() === startDate.getTime() + option.ms;

              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.chipPressed,
                  ]}
                  onPress={() => handleQuickEnd(option.ms)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.hint}>
            Tap a chip to set the end time from start.
          </Text>
        </View>

        {message && (
          <View style={styles.messageBox}>
            <Ionicons
              name={payload ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={payload ? THEME.green : THEME.yellow}
            />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        <View style={styles.buttonWrap}>
          <AppButton
            theme="primary"
            title={saving ? 'Creating Event...' : 'Create Event'}
            icon={saving ? 'hourglass-outline' : 'add-circle-outline'}
            onPress={handleCreateEvent}
            disabled={saving}
          />
        </View>
      </View>

      {editTarget && (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>
            {editTarget === 'start' ? 'Start Date & Time' : 'End Date & Time'}
          </Text>

          {isAndroid && (
            <Text style={styles.pickerSubtitle}>
              {editingPart === 'date' ? 'Choose date' : 'Choose time'}
            </Text>
          )}

          <DateTimePicker
            key={`${editTarget}-${editingPart}`}
            value={editTarget === 'start' ? startDate : endDate}
            mode={isAndroid ? editingPart : 'datetime'}
            display={isAndroid ? 'default' : 'spinner'}
            onChange={onPickerChange}
          />

          {!isAndroid && (
            <Pressable
              style={styles.doneButton}
              onPress={() => setEditTarget(null)}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}

      {payload && (
        <View style={styles.resultCard}>
          <View style={styles.resultIcon}>
            <Ionicons
              name="checkmark-circle"
              size={28}
              color={THEME.green}
            />
          </View>

          <Text style={styles.resultTitle}>Event Created</Text>

          <View style={styles.qrBox}>
            <QRCode value={payload} size={200} />
          </View>

          <Text style={styles.qrEventTitle}>{title.trim()}</Text>
          <Text style={styles.qrEventCode}>
            EVENT CODE: {eventId.trim()}
          </Text>

          <View style={styles.divider} />
          <Text style={styles.payloadText}>{payload}</Text>
        </View>
      )}
    </ScrollView>
  );
}

type PickerFieldProps = {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({ value, icon, onPress }: PickerFieldProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pickerPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.dateIcon}>
        <Ionicons name={icon} size={21} color={THEME.yellow} />
      </View>

      <View style={styles.dateText}>
        <Text style={styles.pickerValue}>{value}</Text>
        <Text style={styles.pickerCaption}>Tap to change</Text>
      </View>

      <Ionicons name="calendar" size={19} color={THEME.yellow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 25,
    paddingBottom: 44,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  statusIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  statusTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: THEME.text,
    textAlign: 'center',
  },
  statusSubtitle: {
    color: THEME.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 27,
    gap: 13,
  },
  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerEyebrow: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 5,
  },
  headerTitle: {
    color: THEME.text,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  headerBadge: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 17,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.cardLight,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: THEME.yellow,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionSmall: {
    color: THEME.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginBottom: 7,
  },
  label: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 21,
    marginBottom: 9,
  },
  inputWrapper: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    minHeight: 53,
    color: THEME.text,
    fontSize: 14,
    paddingVertical: 12,
  },
  pickerField: {
    minHeight: 73,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 13,
  },
  pickerPressed: {
    opacity: 0.75,
    borderColor: THEME.yellow,
  },
  dateIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: THEME.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    flex: 1,
  },
  pickerValue: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 19,
  },
  pickerCaption: {
    color: THEME.green,
    fontSize: 11,
    marginTop: 4,
  },
  quickSection: {
    marginTop: 22,
    padding: 14,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 13,
  },
  quickTitle: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: THEME.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  chipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  chipText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: THEME.background,
  },
  hint: {
    color: THEME.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 11,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    padding: 13,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
  },
  messageText: {
    flex: 1,
    color: THEME.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  buttonWrap: {
    marginTop: 25,
  },
  pickerContainer: {
    alignItems: 'center',
    padding: 17,
    marginTop: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
  },
  pickerTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerSubtitle: {
    color: THEME.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  doneButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: THEME.yellow,
  },
  doneText: {
    color: THEME.background,
    fontSize: 14,
    fontWeight: '900',
  },
  resultCard: {
    alignItems: 'center',
    padding: 20,
    marginTop: 24,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
  },
  resultIcon: {
    marginBottom: 8,
  },
  resultTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 19,
  },
  qrBox: {
    padding: 14,
    backgroundColor: THEME.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 17,
  },
  qrEventTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  qrEventCode: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 7,
    marginBottom: 17,
  },
  payloadText: {
    color: THEME.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
});
