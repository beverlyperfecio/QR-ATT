import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
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

type StatusFilter = 'All' | 'Present' | 'Late' | 'Absent';

const UI = {
  background: '#101827',
  card: '#1B2638',
  cardAlt: '#202F46',
  border: '#354258',
  text: '#F1F5F9',
  muted: '#A7B4C7',
  yellow: '#EFBC13',
  green: '#3cd29b',
  red: '#EF6464',
};

const STATUS_COLORS = {
  Present: UI.green,
  Late: UI.yellow,
  Absent: UI.red,
};

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'Unknown student';
}

function formatDate(iso: string) {
  if (!iso) return 'Date unavailable';

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const color =
    STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? UI.muted;

  return (
    <View
      style={[
        styles.statusBadge,
        {
          borderColor: color,
          backgroundColor: `${color}18`,
        },
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{status}</Text>
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? (
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={29} color={UI.yellow} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        setRole(null);
        setStudentRecords([]);
        setTeacherEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

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
        setErrorMessage(
          'Unable to load attendance records. Please check your connection and try again.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const allAttendees = useMemo(
    () => teacherEvents.flatMap((event) => event.attendees),
    [teacherEvents],
  );

  const presentCount = allAttendees.filter(
    (item) => item.status === 'Present',
  ).length;

  const lateCount = allAttendees.filter(
    (item) => item.status === 'Late',
  ).length;

  const absentCount = allAttendees.filter(
    (item) => item.status === 'Absent',
  ).length;

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teacherEvents
      .map((event) => ({
        ...event,
        attendees: event.attendees.filter((attendee) => {
          const matchesSearch =
            !query ||
            (attendee.studentName ?? '').toLowerCase().includes(query) ||
            attendee.studentId.toLowerCase().includes(query) ||
            event.title.toLowerCase().includes(query) ||
            event.eventCode.toLowerCase().includes(query);

          const matchesStatus =
            statusFilter === 'All' || attendee.status === statusFilter;

          return matchesSearch && matchesStatus;
        }),
      }))
      .filter((event) => {
        if (statusFilter === 'All' && !query) return true;
        return event.attendees.length > 0;
      });
  }, [teacherEvents, search, statusFilter]);

  const toggleEvent = (eventId: string) => {
    setExpandedEvents((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
  };

  const handleRefresh = () => {
    void load(true);
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={UI.yellow}
      colors={[UI.yellow]}
      progressBackgroundColor={UI.card}
    />
  );

  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={refreshControl}
        >
          <View style={styles.topHeader}>
            <View style={styles.headingIcon}>
              <Ionicons
                name="clipboard-outline"
                size={25}
                color={UI.background}
              />
            </View>

            <View style={styles.headingTextContainer}>
              <Text style={styles.eyebrow}>TEACHER WORKSPACE</Text>
              <Text style={styles.pageTitle}>Attendance History</Text>
            </View>
          </View>

          <Text style={styles.pageSubtitle}>
            Monitor student attendance across your events.
          </Text>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={21}
                color={UI.red}
              />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={() => void load()} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.overviewCard}>
            <View style={styles.overviewTop}>
              <View>
                <Text style={styles.overviewLabel}>TOTAL EVENTS</Text>
                <Text style={styles.overviewValue}>{teacherEvents.length}</Text>
              </View>

              <View style={styles.overviewIcon}>
                <Ionicons name="calendar" size={25} color={UI.green} />
              </View>
            </View>

            <View style={styles.overviewDivider} />

            <View style={styles.overviewBottom}>
              <Ionicons
                name="people-outline"
                size={18}
                color={UI.green}
              />
              <Text style={styles.overviewDescription}>
                {allAttendees.length} attendance records
              </Text>
            </View>
          </View>

          <SectionHeading
            title="Attendance Overview"
            subtitle="Summary of recorded student statuses"
          />

          <View style={styles.summaryRow}>
            <SummaryCard
              icon="checkmark-circle-outline"
              label="Present"
              value={presentCount}
              color={UI.green}
            />
            <SummaryCard
              icon="time-outline"
              label="Late"
              value={lateCount}
              color={UI.yellow}
            />
            <SummaryCard
              icon="close-circle-outline"
              label="Absent"
              value={absentCount}
              color={UI.red}
            />
          </View>

          <View style={styles.eventsHeading}>
            <SectionHeading
              title="My Events"
              subtitle={`${teacherEvents.length} ${
                teacherEvents.length === 1 ? 'event' : 'events'
              } created`}
            />
          </View>

          {teacherEvents.length > 0 ? (
            <>
              <View style={styles.searchContainer}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={UI.muted}
                />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search student or event..."
                  placeholderTextColor={UI.muted}
                  style={styles.searchInput}
                  returnKeyType="search"
                  autoCapitalize="none"
                />

                {search.length > 0 ? (
                  <Pressable onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={UI.muted}
                    />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {(['All', 'Present', 'Late', 'Absent'] as StatusFilter[]).map(
                  (filter) => {
                    const selected = statusFilter === filter;

                    return (
                      <Pressable
                        key={filter}
                        onPress={() => setStatusFilter(filter)}
                        style={[
                          styles.filterChip,
                          selected && styles.filterChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterText,
                            selected && styles.filterTextActive,
                          ]}
                        >
                          {filter}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </ScrollView>

              {filteredEvents.length === 0 ? (
                <EmptyState
                  icon="search-outline"
                  title="No Matching Records"
                  message="Try a different student name, event code, or status filter."
                />
              ) : (
                filteredEvents.map((event) => {
                  const expanded = expandedEvents.includes(event.eventId);
                  const total = event.attendees.length;

                  return (
                    <View key={event.eventId} style={styles.eventCard}>
                      <Pressable
                        onPress={() => toggleEvent(event.eventId)}
                        style={styles.eventCardHeader}
                      >
                        <View style={styles.eventIcon}>
                          <Ionicons
                            name="calendar-outline"
                            size={23}
                            color={UI.green}
                          />
                        </View>

                        <View style={styles.eventHeading}>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          <Text style={styles.eventCode}>
                            Code: {event.eventCode}
                          </Text>
                          <Text style={styles.eventCount}>
                            {event.attendeeCount} students scanned
                          </Text>
                        </View>

                        <View style={styles.expandButton}>
                          <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={19}
                            color={UI.text}
                          />
                        </View>
                      </Pressable>

                      <View style={styles.eventStatusSummary}>
                        {(
                          ['Present', 'Late', 'Absent'] as const
                        ).map((status) => (
                          <View key={status} style={styles.miniStatus}>
                            <View
                              style={[
                                styles.statusDot,
                                { backgroundColor: STATUS_COLORS[status] },
                              ]}
                            />
                            <Text style={styles.miniStatusText}>
                              {event.attendees.filter(
                                (a) => a.status === status,
                              ).length}{' '}
                              {status}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {expanded ? (
                        <View style={styles.attendeesSection}>
                          <View style={styles.attendeesHeader}>
                            <Text style={styles.attendeesTitle}>
                              Student Records
                            </Text>
                            <Text style={styles.attendeeCountBadge}>
                              {total}
                            </Text>
                          </View>

                          {total === 0 ? (
                            <Text style={styles.noAttendeesText}>
                              No records match the current filters.
                            </Text>
                          ) : (
                            event.attendees.map((attendee, index) => (
                              <View
                                key={`${attendee.studentId}-${attendee.scannedAt ?? 'absent'}-${index}`}
                                style={styles.attendeeRow}
                              >
                                <View style={styles.avatar}>
                                  <Ionicons
                                    name="person-outline"
                                    size={18}
                                    color={UI.yellow}
                                  />
                                </View>

                                <View style={styles.attendeeInfo}>
                                  <Text style={styles.attendeeName}>
                                    {attendee.studentName ||
                                      shortId(attendee.studentId)}
                                  </Text>
                                  <Text style={styles.attendeeDate}>
                                    {attendee.scannedAt
                                      ? formatDate(attendee.scannedAt)
                                      : 'Not scanned'}
                                  </Text>
                                </View>

                                <StatusBadge status={attendee.status} />
                              </View>
                            ))
                          )}
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title={loading ? 'Loading Your Events' : 'No Events Yet'}
              message={
                loading
                  ? 'Your events will appear here shortly.'
                  : 'Create an event from the Teacher tab to start managing attendance.'
              }
            />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={refreshControl}
      >
        <View style={styles.topHeader}>
          <View style={styles.headingIcon}>
            <Ionicons
              name="time-outline"
              size={25}
              color={UI.background}
            />
          </View>

          <View style={styles.headingTextContainer}>
            <Text style={styles.eyebrow}>STUDENT WORKSPACE</Text>
            <Text style={styles.pageTitle}>My Attendance</Text>
          </View>
        </View>

        <Text style={styles.pageSubtitle}>
          Review the events you have attended.
        </Text>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={21}
              color={UI.red}
            />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable onPress={() => void load()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.studentOverview}>
          <View style={styles.studentOverviewIcon}>
            <Ionicons
              name="checkmark-done-outline"
              size={26}
              color={UI.green}
            />
          </View>

          <View style={styles.studentOverviewInfo}>
            <Text style={styles.studentOverviewLabel}>TOTAL ATTENDANCE</Text>
            <Text style={styles.studentOverviewValue}>
              {studentRecords.length}
            </Text>
            <Text style={styles.studentOverviewDescription}>
              Recorded event scans
            </Text>
          </View>
        </View>

        <SectionHeading
          title="Recent Records"
          subtitle="Your attendance history"
        />

        {studentRecords.length === 0 ? (
          <EmptyState
            icon="qr-code-outline"
            title={loading ? 'Loading Attendance' : 'No Attendance Yet'}
            message={
              loading
                ? 'Your attendance records will appear here shortly.'
                : 'Your attendance records will appear here after you scan an event QR code.'
            }
          />
        ) : (
          studentRecords.map((item) => (
            <View key={item.id} style={styles.studentRecordCard}>
              <View style={styles.studentRecordHeader}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={23}
                    color={UI.yellow}
                  />
                </View>

                <View style={styles.eventHeading}>
                  <Text style={styles.eventTitle}>
                    {item.eventTitle || 'Untitled Event'}
                  </Text>
                  <Text style={styles.eventCode}>
                    Event ID: {item.eventId || 'Unknown'}
                  </Text>
                </View>

                <View style={styles.recordCheck}>
                  <Ionicons
                    name="checkmark-circle"
                    size={23}
                    color={UI.green}
                  />
                </View>
              </View>

              <View style={styles.recordDivider} />

              <View style={styles.recordDateRow}>
                <Ionicons
                  name="time-outline"
                  size={17}
                  color={UI.yellow}
                />
                <View style={styles.recordDateInfo}>
                  <Text style={styles.recordDateLabel}>DATE SCANNED</Text>
                  <Text style={styles.recordDate}>
                    {formatDate(item.scannedAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.recordFooter}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={UI.green}
                />
                <Text style={styles.recordFooterText}>
                  Attendance Recorded
                </Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.footerText}>
          Pull down to refresh your attendance history.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.background,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 36,
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  headingIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: UI.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headingTextContainer: {
    flex: 1,
  },

  eyebrow: {
    color: UI.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  pageTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: UI.text,
  },

  pageSubtitle: {
    fontSize: 13,
    color: UI.muted,
    lineHeight: 20,
    marginTop: 13,
    marginBottom: 22,
  },

  overviewCard: {
    backgroundColor: UI.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 25,
  },

  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  overviewLabel: {
    fontSize: 10,
    color: UI.muted,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  overviewValue: {
    fontSize: 36,
    fontWeight: '900',
    color: UI.text,
    marginTop: 5,
  },

  overviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: UI.cardAlt,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overviewDivider: {
    height: 1,
    backgroundColor: UI.border,
    marginVertical: 15,
  },

  overviewBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  overviewDescription: {
    color: UI.muted,
    fontSize: 12,
    fontWeight: '600',
  },

  sectionHeading: {
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: UI.muted,
    marginTop: 5,
    lineHeight: 18,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 26,
  },

  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: UI.card,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 13,
    paddingHorizontal: 8,
  },

  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  summaryValue: {
    fontSize: 23,
    fontWeight: '900',
    color: UI.text,
  },

  summaryLabel: {
    fontSize: 11,
    color: UI.muted,
    fontWeight: '700',
    marginTop: 3,
  },

  eventsHeading: {
    marginBottom: 2,
  },

  searchContainer: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: UI.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 13,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    color: UI.text,
    fontSize: 13,
    paddingVertical: 11,
  },

  filterRow: {
    gap: 8,
    paddingBottom: 15,
  },

  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },

  filterChipActive: {
    backgroundColor: UI.yellow,
    borderColor: UI.yellow,
  },

  filterText: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.muted,
  },

  filterTextActive: {
    color: UI.background,
  },

  eventCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 13,
  },

  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  eventIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: UI.cardAlt,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventHeading: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
    lineHeight: 21,
  },

  eventCode: {
    fontSize: 11,
    color: UI.muted,
    marginTop: 4,
  },

  eventCount: {
    fontSize: 11,
    color: UI.green,
    fontWeight: '700',
    marginTop: 5,
  },

  expandButton: {
    width: 33,
    height: 33,
    borderRadius: 11,
    backgroundColor: UI.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventStatusSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 13,
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },

  miniStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  miniStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: UI.muted,
  },

  attendeesSection: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    paddingTop: 13,
  },

  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  attendeesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.yellow,
  },

  attendeeCountBadge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: UI.cardAlt,
    color: UI.yellow,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 26,
  },

  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: UI.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  attendeeInfo: {
    flex: 1,
  },

  attendeeName: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.text,
  },

  attendeeDate: {
    fontSize: 10,
    color: UI.muted,
    marginTop: 5,
    lineHeight: 15,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },

  noAttendeesText: {
    fontSize: 12,
    color: UI.muted,
    lineHeight: 19,
    paddingVertical: 12,
  },

  studentOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 18,
    borderRadius: 19,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 26,
  },

  studentOverviewIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: UI.cardAlt,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  studentOverviewInfo: {
    flex: 1,
  },

  studentOverviewLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: UI.muted,
  },

  studentOverviewValue: {
    fontSize: 31,
    fontWeight: '900',
    color: UI.text,
    marginTop: 3,
  },

  studentOverviewDescription: {
    fontSize: 11,
    color: UI.muted,
    marginTop: 2,
  },

  studentRecordCard: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 17,
    padding: 15,
    marginBottom: 13,
  },

  studentRecordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  recordCheck: {
    marginLeft: 3,
  },

  recordDivider: {
    height: 1,
    backgroundColor: UI.border,
    marginVertical: 15,
  },

  recordDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  recordDateInfo: {
    flex: 1,
  },

  recordDateLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: UI.muted,
  },

  recordDate: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.text,
    marginTop: 5,
    lineHeight: 18,
  },

  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: '#163B36',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 15,
  },

  recordFooterText: {
    color: UI.green,
    fontSize: 10,
    fontWeight: '800',
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: UI.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 24,
    paddingVertical: 30,
    marginBottom: 16,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 19,
    backgroundColor: UI.cardAlt,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 19,
    color: UI.muted,
    textAlign: 'center',
    marginTop: 8,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#40262D',
    borderWidth: 1,
    borderColor: '#75404A',
    borderRadius: 13,
    padding: 12,
    marginBottom: 17,
  },

  errorText: {
    flex: 1,
    color: UI.text,
    fontSize: 11,
    lineHeight: 17,
  },

  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  retryText: {
    color: UI.yellow,
    fontSize: 12,
    fontWeight: '900',
  },

  footerText: {
    fontSize: 10,
    color: UI.muted,
    textAlign: 'center',
    marginTop: 13,
    marginBottom: 8,
  },
});
