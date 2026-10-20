import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
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

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import {
  createEvent,
  getEventsByTeacher,
  type CloudEvent,
} from '@/lib/events';
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
  red: '#d41c1c',
};


function toLocalISO(date: Date) {
  return date.toISOString();
}

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });

  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} · ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatSavedDateTime(value: string | null) {
  if (!value) return 'Not set';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return formatDateTime(date);
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

  const [savedEvents, setSavedEvents] = useState<CloudEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [messageIsSuccess, setMessageIsSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAndroid = Platform.OS === 'android';

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRole(null);
        setRoleLoading(false);
        setSavedEvents([]);

        return () => {
          active = false;
        };
      }

      setRoleLoading(true);

      getProfile(user.id)
        .then((profile) => {
          if (active) {
            setRole(profile?.role ?? 'student');
          }
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

  const loadSavedEvents = useCallback(async () => {
    if (!user || role !== 'teacher') {
      setSavedEvents([]);
      return;
    }

    setEventsLoading(true);

    try {
      const events = await getEventsByTeacher(user.id);
      setSavedEvents(events);
    } catch {
      setMessage('Could not load your saved events.');
      setMessageIsSuccess(false);
    } finally {
      setEventsLoading(false);
    }
  }, [user, role]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user || role !== 'teacher') {
        setSavedEvents([]);
        return;
      }

      const load = async () => {
        setEventsLoading(true);

        try {
          const events = await getEventsByTeacher(user.id);

          if (active) setSavedEvents(events);
        } catch {
          if (active) {
            setMessage('Could not load your saved events.');
            setMessageIsSuccess(false);
          }
        } finally {
          if (active) setEventsLoading(false);
        }
      };

      void load();

      return () => {
        active = false;
      };
    }, [user, role])
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
      setMessageIsSuccess(false);
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('End time must be after start time.');
      setMessageIsSuccess(false);
      return;
    }

    setSaving(true);
    setMessage(null);
    setMessageIsSuccess(false);

    try {
      const { error } = await createEvent(event);

      if (error) {
        setMessage(`Could not save the event: ${error}`);
        setMessageIsSuccess(false);
        return;
      }

      if (user) {
        const events = await getEventsByTeacher(user.id);
        setSavedEvents(events);
      }

      setMessage('Event saved successfully! Its QR code is shown below.');
      setMessageIsSuccess(true);

      setTitle('');
      setEventId('');
    } catch {
      setMessage('Something went wrong while saving the event.');
      setMessageIsSuccess(false);
    } finally {
      setSaving(false);
    }
  };

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
          <Text style={styles.headerTitle}>Teacher Dashboard</Text>
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
            <Text style={styles.sectionTitle}>Create Event</Text>
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
            Tap a chip to set the end time from the event start.
          </Text>
        </View>

        {message && (
          <View style={styles.messageBox}>
            <Ionicons
              name={
                messageIsSuccess
                  ? 'checkmark-circle'
                  : 'alert-circle'
              }
              size={20}
              color={messageIsSuccess ? THEME.green : THEME.yellow}
            />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        <View style={styles.buttonWrap}>
          <AppButton
            theme="primary"
            title={saving ? 'Creating Event...' : 'Create Event'}
            icon="add-circle-outline"
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

      <View style={styles.eventsSection}>
        <View style={styles.eventsHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="calendar"
              size={22}
              color={THEME.yellow}
            />
          </View>

          <View style={styles.eventsHeaderText}>
            <Text style={styles.sectionTitle}>My Events</Text>
            <Text style={styles.sectionSmall}>
              {savedEvents.length} SAVED EVENT
              {savedEvents.length === 1 ? '' : 'S'}
            </Text>
          </View>

          <Pressable
  accessibilityRole="button"
  style={styles.refreshButton}
  onPress={() => void loadSavedEvents()}
  disabled={eventsLoading}
>
  <Ionicons
    name="refresh-outline"
    size={22}
    color={THEME.yellow}
  />
</Pressable>
        </View>

       {eventsLoading && savedEvents.length === 0 ? (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyText}>Loading your events...</Text>
  </View>
) : savedEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="calendar-outline"
              size={42}
              color={THEME.muted}
            />
            <Text style={styles.emptyTitle}>No Events Yet</Text>
            <Text style={styles.emptyText}>
              Create an event above. Your saved event and its QR code will
              appear here.
            </Text>
          </View>
        ) : (
          savedEvents.map((item) => {
            const qrPayload = buildQRPayload({
              eventId: item.event_code,
              title: item.title,
              start: item.start_time ?? undefined,
              end: item.end_time ?? undefined,
            });

            return (
              <View key={item.id} style={styles.eventCard}>
                <View style={styles.eventTopRow}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      name="calendar"
                      size={23}
                      color={THEME.green}
                    />
                  </View>

                  <View style={styles.eventHeading}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventCode}>
                      CODE: {item.event_code}
                    </Text>
                  </View>

                  <View style={styles.savedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={THEME.green}
                    />
                    <Text style={styles.savedBadgeText}>Saved</Text>
                  </View>
                </View>

                <View style={styles.eventDateRow}>
                  <Ionicons
                    name="play-circle-outline"
                    size={17}
                    color={THEME.green}
                  />
                  <View style={styles.eventDateTextContainer}>
                    <Text style={styles.eventDateLabel}>START</Text>
                    <Text style={styles.eventDateValue}>
                      {formatSavedDateTime(item.start_time)}
                    </Text>
                  </View>
                </View>

                <View style={styles.eventDateRow}>
                  <Ionicons
                    name="stop-circle-outline"
                    size={17}
                    color={THEME.red}
                  />
                  <View style={styles.eventDateTextContainer}>
                    <Text style={styles.eventDateLabel}>END</Text>
                    <Text style={styles.eventDateValue}>
                      {formatSavedDateTime(item.end_time)}
                    </Text>
                  </View>
                </View>

                <View style={styles.qrDivider} />

                <Text style={styles.qrHeading}>EVENT QR CODE</Text>

                <View style={styles.qrBox}>
                  <QRCode
                    value={qrPayload}
                    size={190}
                    backgroundColor="white"
                    color="black"
                  />
                </View>

                <Text style={styles.qrInstruction}>
                  Students can scan this QR code to record their attendance.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.payloadToggle,
                    pressed && styles.chipPressed,
                  ]}
                  onPress={() => {
                    setMessage(`QR code ready for ${item.event_code}.`);
                    setMessageIsSuccess(true);
                  }}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={17}
                    color={THEME.green}
                  />
                  <Text style={styles.payloadToggleText}>
                    QR generated for this event
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
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

      <Ionicons name="calendar" size={19} color={THEME.green} />
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
    fontSize: 25,
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

  eventsSection: {
    marginTop: 28,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  eventsHeaderText: {
    flex: 1,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 13,
  },
  emptyText: {
    color: THEME.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  eventCard: {
    padding: 17,
    marginBottom: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 20,
  },
  eventIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: THEME.cardLight,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventHeading: {
    flex: 1,
  },
  eventTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  eventCode: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 6,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  savedBadgeText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: '800',
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  eventDateTextContainer: {
    flex: 1,
  },
  eventDateLabel: {
    color: THEME.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  eventDateValue: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  qrDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginTop: 6,
    marginBottom: 19,
  },
  qrHeading: {
    color: THEME.yellow,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 15,
  },
  qrBox: {
    alignSelf: 'center',
    padding: 14,
    backgroundColor: THEME.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  qrInstruction: {
    color: THEME.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 15,
  },
  payloadToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 13,
    backgroundColor: THEME.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  payloadToggleText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: '800',
  },
});