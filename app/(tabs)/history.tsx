
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'Unknown student';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [teacherEvents, setTeacherEvents] = useState<
    TeacherEventAttendance[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setRole(null);
      setStudentRecords([]);
      setTeacherEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);

        setTeacherEvents(events);
        setStudentRecords([]);
      } else {
        const records = await getAttendanceHistory(user.id);

        setStudentRecords(records);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Attendance History</Text>

        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={styles.loader}
        />

        <Text style={styles.subtitle}>Loading records...</Text>
      </View>
    );
  }

  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Attendance History</Text>

        <Text style={styles.subtitle}>
          View attendance records and student counts for your events.
        </Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="people-outline"
              size={22}
              color={COLORS.primary}
            />

            <Text style={styles.sectionTitle}>My Events</Text>
          </View>

          {teacherEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="calendar-outline"
                size={38}
                color={COLORS.primary}
              />

              <Text style={styles.emptyTitle}>No Events Yet</Text>

              <Text style={styles.emptyText}>
                Create an event in the Teacher tab to start
                recording attendance.
              </Text>
            </View>
          ) : (
            <FlatList
              data={teacherEvents}
              keyExtractor={(item) => item.eventId}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.eventHeader}>
                    <View style={styles.eventIcon}>
                      <Ionicons
                        name="calendar"
                        size={23}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={styles.eventHeading}>
                      <Text style={styles.eventTitle}>
                        {item.title}
                      </Text>

                      <Text style={styles.eventMeta}>
                        Event Code: {item.eventCode}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.counter}>
                    <Ionicons
                      name="people"
                      size={20}
                      color={COLORS.primary}
                    />

                    <Text style={styles.counterText}>
                      {item.attendeeCount}{' '}
                      {item.attendeeCount === 1
                        ? 'student'
                        : 'students'}{' '}
                      scanned
                    </Text>
                  </View>

                  <View style={styles.attendeesHeader}>
                    <Text style={styles.attendeesTitle}>
                      Attendance Records
                    </Text>

                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {item.attendees.length}
                      </Text>
                    </View>
                  </View>

                  {item.attendees.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No attendance records yet. Absent students will
                      appear after the event ends.
                    </Text>
                  ) : (
                    item.attendees.map((attendee, index) => (
                      <View
                        key={`${attendee.studentId}-${attendee.scannedAt ?? 'absent'}-${index}`}
                        style={styles.attendeeRow}
                      >
                        <View style={styles.avatar}>
                          <Ionicons
                            name="person"
                            size={19}
                            color={COLORS.primary}
                          />
                        </View>

                        <View style={styles.attendeeInfo}>
                          <Text style={styles.attendeeName}>
                            {attendee.studentName ||
                              shortId(attendee.studentId)}
                          </Text>

                          <Text style={styles.smallText}>
                            {attendee.scannedAt
                              ? formatDate(attendee.scannedAt)
                              : 'Not scanned'}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            attendee.status === 'Present' &&
                              styles.presentBadge,
                            attendee.status === 'Late' &&
                              styles.lateBadge,
                            attendee.status === 'Absent' &&
                              styles.absentBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              attendee.status === 'Present' &&
                                styles.presentText,
                              attendee.status === 'Late' &&
                                styles.lateText,
                              attendee.status === 'Absent' &&
                                styles.absentText,
                            ]}
                          >
                            {attendee.status}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>

      <Text style={styles.subtitle}>
        Your previous event attendance records.
      </Text>

      {studentRecords.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="time-outline"
            size={42}
            color={COLORS.primary}
          />

          <Text style={styles.emptyTitle}>No Attendance Yet</Text>

          <Text style={styles.emptyText}>
            Scan an event QR code to record your attendance.
          </Text>
        </View>
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.studentRecordHeader}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#16CB7D"
                  />
                </View>

                <View style={styles.eventHeading}>
                  <Text style={styles.eventTitle}>
                    {item.eventTitle || 'Untitled Event'}
                  </Text>

                  <Text style={styles.eventMeta}>
                    Event Code: {item.eventId || 'Unknown'}
                  </Text>
                </View>
              </View>

              <View style={styles.recordDivider} />

              <View style={styles.dateRow}>
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={COLORS.primary}
                />

                <Text style={styles.smallText}>
                  Attended: {formatDate(item.scannedAt)}
                </Text>
              </View>

              <View style={styles.attendedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color="#16CB7D"
                />

                <Text style={styles.attendedBadgeText}>
                  Attendance Recorded
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    paddingTop: 24,
  },

  loader: {
    marginTop: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    opacity: 0.8,
    marginBottom: 18,
    lineHeight: 21,
  },

  section: {
    flex: 1,
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },

  list: {
    paddingBottom: 24,
    gap: 12,
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  studentRecordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventHeading: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    flexShrink: 1,
  },

  eventMeta: {
    fontSize: 13,
    color: COLORS.textPrimary,
    opacity: 0.8,
    marginTop: 5,
  },

  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 16,
    padding: 11,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  attendeesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  countBadge: {
    minWidth: 27,
    height: 27,
    paddingHorizontal: 7,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  attendeeInfo: {
    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },

  presentBadge: {
    backgroundColor: '#123D31',
    borderColor: '#16CB7D',
  },

  lateBadge: {
    backgroundColor: '#493719',
    borderColor: '#F4C542',
  },

  absentBadge: {
    backgroundColor: '#49252D',
    borderColor: '#F87171',
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  presentText: {
    color: '#16CB7D',
  },

  lateText: {
    color: '#F4C542',
  },

  absentText: {
    color: '#F87171',
  },

  attendeeName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  smallText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    opacity: 0.8,
    marginTop: 3,
    lineHeight: 18,
  },

  recordDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  attendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },

  attendedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16CB7D',
  },

  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 24,
    marginTop: 8,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    opacity: 0.8,
    paddingVertical: 8,
    lineHeight: 20,
  },
});
