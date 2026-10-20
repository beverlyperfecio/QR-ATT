import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

const C = {
  navy: '#17283B',
  navyLight: '#25394D',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#1C2C3C',
  muted: '#788594',
  border: '#E5EAF0',
  green: '#16845B',
  greenLight: '#E8F5EE',
  yellow: '#F2C230',
  yellowLight: '#FFF7DF',
  blueLight: '#EAF0F8',
  red: '#C74B4B',
  redLight: '#FCECEC',
};

type Role = 'student' | 'teacher';
type IconName = React.ComponentProps<typeof Ionicons>['name'];
type EventStatus = 'Upcoming' | 'Ongoing' | 'Ended' | 'Scheduled';

type SchoolEvent = {
  id: string;
  title: string;
  event_code?: string | null;
  start_time: string;
  end_time: string;
};

function formatDate(value?: string | null) {
  if (!value) return 'Schedule to be announced';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Schedule to be announced';
  }

  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getEventStatus(event: SchoolEvent): EventStatus {
  const now = Date.now();
  const start = new Date(event.start_time).getTime();
  const end = new Date(event.end_time).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) return 'Scheduled';
  if (now < start) return 'Upcoming';
  if (now <= end) return 'Ongoing';

  return 'Ended';
}

function getStatusStyle(status: EventStatus) {
  switch (status) {
    case 'Ongoing':
      return {
        pill: styles.ongoingPill,
        text: styles.ongoingText,
      };
    case 'Ended':
      return {
        pill: styles.endedPill,
        text: styles.endedText,
      };
    case 'Scheduled':
      return {
        pill: styles.scheduledPill,
        text: styles.scheduledText,
      };
    default:
      return {
        pill: styles.upcomingPill,
        text: styles.upcomingText,
      };
  }
}

export default function Index() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role>('student');
  const [fullName, setFullName] = useState('');
  const [loadingRole, setLoadingRole] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadProfile() {
        if (!user?.id) {
          if (active) {
            setRole('student');
            setFullName('');
            setLoadingRole(false);
          }
          return;
        }

        setLoadingRole(true);

        try {
          const profile = await getProfile(user.id);

          if (!active) return;

          const normalizedRole = String(profile?.role ?? 'student')
            .trim()
            .toLowerCase();

          setRole(normalizedRole === 'teacher' ? 'teacher' : 'student');
          setFullName(String(profile?.full_name ?? '').trim());
        } catch (error) {
          console.error('Failed to load profile:', error);

          if (active) {
            setRole('student');
            setFullName('');
          }
        } finally {
          if (active) setLoadingRole(false);
        }
      }

      loadProfile();

      return () => {
        active = false;
      };
    }, [user?.id])
  );

  if (loadingRole) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />

    
      </SafeAreaView>
    );
  }

  return role === 'teacher' ? (
    <TeacherDashboard fullName={fullName} userId={user?.id ?? ''} />
  ) : (
    <StudentDashboard fullName={fullName} userId={user?.id ?? ''} />
  );
}


function Brand({ subtitle }: { subtitle: string }) {
  return (
    <View style={styles.brand}>
      <View style={styles.brandLogo}>
        <Ionicons name="qr-code-outline" size={25} color={C.navy} />
      </View>

      <View>
        <Text style={styles.brandName}>QR ATTENDANCE</Text>
      </View>
    </View>
  );
}

function ProfileButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      style={({ pressed }) => [
        styles.profileButton,
        pressed && styles.pressed,
      ]}
      onPress={() => router.push('/profile')}
    >
      <Ionicons name="person-outline" size={21} color={C.yellow} />
    </Pressable>
  );
}

function EventStatusBadge({ status }: { status: EventStatus }) {
  const statusStyle = getStatusStyle(status);

  return (
    <View style={[styles.statusPill, statusStyle.pill]}>
      <View
        style={[
          styles.statusDot,
          status === 'Ongoing' && styles.ongoingDot,
          status === 'Ended' && styles.endedDot,
        ]}
      />
      <Text style={[styles.statusPillText, statusStyle.text]}>
        {status}
      </Text>
    </View>
  );
}

function EmptyEvents({
  teacher = false,
  onCreate,
}: {
  teacher?: boolean;
  onCreate?: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="calendar-outline"
          size={28}
          color={C.green}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {teacher ? 'No events created yet' : 'No upcoming events'}
      </Text>

      <Text style={styles.emptyDescription}>
        {teacher
          ? 'Create a school event to start organizing student attendance.'
          : 'School events created by your teachers will appear here automatically.'}
      </Text>

      {teacher && onCreate ? (
        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.pressed,
          ]}
          onPress={onCreate}
        >
          <Ionicons name="add" size={19} color={C.white} />
          <Text style={styles.createButtonText}>Create event</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StudentDashboard({
  fullName,
  userId,
}: {
  fullName: string;
  userId: string;
}) {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = fullName
    ? fullName.split(/\s+/)[0]
    : 'Student';

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoadingEvents(true);
    }

    setEventsError(false);

    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_code, start_time, end_time')
        .gte('end_time', now)
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) throw error;

      setEvents((data ?? []) as SchoolEvent[]);
    } catch (error) {
      console.error('Failed to load student events:', error);
      setEventsError(true);
    } finally {
      setLoadingEvents(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function refreshEvents() {
        if (!active) return;
        await loadEvents();
      }

      refreshEvents();

      return () => {
        active = false;
      };
    }, [loadEvents, userId])
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadEvents(true)}
            tintColor={C.green}
          />
        }
        contentContainerStyle={styles.studentScroll}
      >
        <View style={styles.studentHeader}>
          <View style={styles.topBar}>
            <Brand subtitle="STUDENT PORTAL" />
            <ProfileButton />
          </View>

          <View style={styles.studentGreetingBlock}>
            <Text style={styles.lightEyebrow}>YOUR ATTENDANCE, IN ONE PLACE</Text>

            <Text style={styles.studentGreeting}>
              Hello, {firstName}.
            </Text>

            <Text style={styles.studentDescription}>
              Keep track of school activities and check in to your events
              with your QR code.
            </Text>
          </View>

          <View style={styles.studentHeaderFooter}>
            <View style={styles.headerFooterIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={19}
                color={C.yellow}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerFooterTitle}>
                Stay ready for your next event
              </Text>
              <Text style={styles.headerFooterSubtitle}>
                Check your schedule before attendance.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.studentContent}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/scan')}
          >
            <View style={styles.scanButtonIcon}>
              <Ionicons name="scan-outline" size={29} color={C.navy} />
            </View>

            <View style={styles.scanButtonText}>
              <Text style={styles.scanOverline}>QUICK CHECK-IN</Text>
              <Text style={styles.scanButtonTitle}>Scan event QR</Text>
              <Text style={styles.scanButtonSubtitle}>
                Record your attendance for an event.
              </Text>
            </View>

            <Ionicons name="arrow-forward" size={22} color={C.navy} />
          </Pressable>

          <View style={styles.sectionHeading}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Upcoming events</Text>
              <Text style={styles.sectionSubtitle}>
                Events and schedules from your teachers
              </Text>
            </View>

            <View style={styles.sectionIcon}>
              <Ionicons
                name="calendar-outline"
                size={22}
                color={C.green}
              />
            </View>
          </View>

          {loadingEvents ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>
                Loading upcoming events...
              </Text>
            </View>
          ) : eventsError ? (
            <View style={styles.stateCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={27}
                  color={C.red}
                />
              </View>

              <Text style={styles.emptyTitle}>Unable to load events</Text>
              <Text style={styles.stateText}>
                Please check your connection and try again.
              </Text>

              <Pressable
                style={styles.retryButton}
                onPress={() => loadEvents()}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : events.length === 0 ? (
            <EmptyEvents />
          ) : (
            <View style={styles.eventList}>
              {events.map((event) => {
                const status = getEventStatus(event);

                return (
                  <View key={event.id} style={styles.studentEventCard}>
                    <View style={styles.eventDateBlock}>
                      <Text style={styles.eventDateMonth}>
                        {new Date(event.start_time).toLocaleDateString(
                          'en-PH',
                          { month: 'short' }
                        )}
                      </Text>

                      <Text style={styles.eventDateDay}>
                        {new Date(event.start_time).toLocaleDateString(
                          'en-PH',
                          { day: 'numeric' }
                        )}
                      </Text>

                      <View style={styles.dateCalendarIcon}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color={C.green}
                        />
                      </View>
                    </View>

                    <View style={styles.eventDetails}>
                      <EventStatusBadge status={status} />

                      <Text style={styles.eventTitle}>{event.title}</Text>

                      <View style={styles.eventInfoRow}>
                        <Ionicons
                          name="calendar-clear-outline"
                          size={14}
                          color={C.muted}
                        />
                        <Text style={styles.eventInfoText}>
                          {formatDate(event.start_time)}
                        </Text>
                      </View>

                      <View style={styles.eventInfoRow}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={C.muted}
                        />
                        <Text style={styles.eventInfoText}>
                          {formatTime(event.start_time)}
                          {event.end_time
                            ? ` – ${formatTime(event.end_time)}`
                            : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.historyLink,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/history')}
          >
            <View style={styles.historyLinkIcon}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color={C.navy}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>My attendance history</Text>
              <Text style={styles.rowDescription}>
                View your attendance records and status.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={C.muted}
            />
          </Pressable>

          <View style={styles.footerNote}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={C.green}
            />
            <Text style={styles.footerNoteText}>
              Scan the event QR code during the scheduled attendance period.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TeacherDashboard({
  fullName,
  userId,
}: {
  fullName: string;
  userId: string;
}) {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = fullName
    ? fullName.split(/\s+/)[0]
    : 'Teacher';

  const loadTeacherEvents = useCallback(async (isRefresh = false) => {
    if (!userId) {
      setEvents([]);
      setLoadingEvents(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoadingEvents(true);
    }

    setEventsError(false);

    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_code, start_time, end_time')
        .eq('created_by', userId)
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) throw error;

      setEvents((data ?? []) as SchoolEvent[]);
    } catch (error) {
      console.error('Failed to load teacher events:', error);
      setEventsError(true);
    } finally {
      setLoadingEvents(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadTeacherEvents();

      return () => {};
    }, [loadTeacherEvents])
  );

  const upcomingCount = events.filter(
    (event) => getEventStatus(event) === 'Upcoming'
  ).length;

  const ongoingCount = events.filter(
    (event) => getEventStatus(event) === 'Ongoing'
  ).length;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTeacherEvents(true)}
            tintColor={C.green}
          />
        }
        contentContainerStyle={styles.teacherScroll}
      >
        <View style={styles.teacherHeader}>
          <View style={styles.topBar}>
            <Brand subtitle="TEACHER WORKSPACE" />
            <ProfileButton />
          </View>

          <View style={styles.teacherGreetingBlock}>
            <Text style={styles.lightEyebrow}>EVENT ADMINISTRATION</Text>
            <Text style={styles.teacherGreeting}>
              Good day, {firstName}.
            </Text>
            <Text style={styles.teacherDescription}>
              Create school events, prepare QR check-ins, and monitor
              student attendance from your dashboard.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.createEventBanner,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/teacher')}
          >
            <View style={styles.createEventIcon}>
              <Ionicons name="add" size={28} color={C.navy} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.createEventTitle}>Create a school event</Text>
              <Text style={styles.createEventSubtitle}>
                Set a schedule and generate an event QR code.
              </Text>
            </View>

            <Ionicons name="arrow-forward" size={21} color={C.navy} />
          </Pressable>
        </View>

        <View style={styles.teacherContent}>
          <View style={styles.sectionHeading}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Event overview</Text>
              <Text style={styles.sectionSubtitle}>
                A quick view of your scheduled activities
              </Text>
            </View>

            <View style={styles.sectionIcon}>
              <Ionicons
                name="stats-chart-outline"
                size={22}
                color={C.green}
              />
            </View>
          </View>

          <View style={styles.teacherSummary}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={C.green}
                />
              </View>
              <Text style={styles.summaryLabel}>MY EVENTS</Text>
              <Text style={styles.summaryValue}>
                {loadingEvents || eventsError ? '—' : events.length}
              </Text>
              <Text style={styles.summaryCaption}>Recent events</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconYellow}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color="#8B6900"
                />
              </View>
              <Text style={styles.summaryLabel}>UPCOMING</Text>
              <Text style={styles.summaryValue}>
                {loadingEvents || eventsError ? '—' : upcomingCount}
              </Text>
              <Text style={styles.summaryCaption}>Not started yet</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconBlue}>
                <Ionicons
                  name="radio-button-on-outline"
                  size={20}
                  color="#3C65A0"
                />
              </View>
              <Text style={styles.summaryLabel}>ONGOING</Text>
              <Text style={styles.summaryValue}>
                {loadingEvents || eventsError ? '—' : ongoingCount}
              </Text>
              <Text style={styles.summaryCaption}>In progress</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Attendance tools</Text>
          <Text style={styles.sectionSubtitle}>
            Manage events and review student attendance.
          </Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.toolCard,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/history')}
          >
            <View style={styles.toolIconGreen}>
              <Ionicons
                name="clipboard-outline"
                size={25}
                color={C.green}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle}>Attendance records</Text>
              <Text style={styles.toolDescription}>
                Review Present, Late, and Absent records for your events.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={C.muted}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.toolCard,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/teacher')}
          >
            <View style={styles.toolIconYellow}>
              <Ionicons
                name="calendar-number-outline"
                size={25}
                color="#8B6900"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle}>Event management</Text>
              <Text style={styles.toolDescription}>
                Create events, set attendance schedules, and manage QR codes.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={C.muted}
            />
          </Pressable>

          <View style={styles.teacherEventsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Your events</Text>
              <Text style={styles.sectionSubtitle}>
                Events created by your account
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/teacher')}
              accessibilityRole="button"
            >
              <Text style={styles.viewAllText}>Manage</Text>
            </Pressable>
          </View>

          {loadingEvents ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>Loading your events...</Text>
            </View>
          ) : eventsError ? (
            <View style={styles.stateCard}>
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={C.red}
              />
              <Text style={styles.emptyTitle}>Events unavailable</Text>
              <Text style={styles.stateText}>
                We couldn't load your events. Please try again.
              </Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => loadTeacherEvents()}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : events.length === 0 ? (
            <EmptyEvents
              teacher
              onCreate={() => router.push('/teacher')}
            />
          ) : (
            <View style={styles.eventList}>
              {events.map((event) => {
                const status = getEventStatus(event);

                return (
                  <View key={event.id} style={styles.teacherEventCard}>
                    <View style={styles.teacherEventIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={24}
                        color={C.green}
                      />
                    </View>

                    <View style={styles.teacherEventDetails}>
                      <Text style={styles.teacherEventTitle}>
                        {event.title}
                      </Text>

                      <View style={styles.eventInfoRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={13}
                          color={C.muted}
                        />
                        <Text style={styles.eventInfoText}>
                          {formatDate(event.start_time)}
                        </Text>
                      </View>

                      <View style={styles.eventInfoRow}>
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color={C.muted}
                        />
                        <Text style={styles.eventInfoText}>
                          {formatTime(event.start_time)}
                          {event.end_time
                            ? ` – ${formatTime(event.end_time)}`
                            : ''}
                        </Text>
                      </View>
                    </View>

                    <EventStatusBadge status={status} />
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.profileLink,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/profile')}
          >
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingLogo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    color: '#BAC7D4',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 20,
  },

  studentScroll: {
    paddingBottom: 30,
  },
  teacherScroll: {
    paddingBottom: 30,
  },
  studentHeader: {
    backgroundColor: C.navy,
    paddingHorizontal: 21,
    paddingTop: 14,
    paddingBottom: 23,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  teacherHeader: {
    backgroundColor: C.navy,
    paddingHorizontal: 21,
    paddingTop: 14,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: C.yellow,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  profileButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#405367',
    backgroundColor: C.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentGreetingBlock: {
    marginTop: 32,
  },
  lightEyebrow: {
    color: C.yellow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 10,
  },
  studentGreeting: {
    color: C.white,
    fontSize: 31,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  studentDescription: {
    color: '#C3CFDA',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
    maxWidth: 340,
  },
  studentHeaderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderTopWidth: 1,
    borderTopColor: '#3B4E62',
    paddingTop: 16,
    marginTop: 22,
  },
  headerFooterIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: C.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFooterTitle: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  headerFooterSubtitle: {
    color: '#BAC7D4',
    fontSize: 10,
    marginTop: 4,
  },
  studentContent: {
    paddingHorizontal: 19,
    paddingTop: 21,
  },
  scanButton: {
    backgroundColor: C.yellow,
    borderRadius: 19,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  scanButtonIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: '#FFE99B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: {
    flex: 1,
  },
  scanOverline: {
    color: '#6B5718',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  scanButtonTitle: {
    color: C.navy,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  scanButtonSubtitle: {
    color: '#66592F',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  sectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  stateCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 23,
    minHeight: 165,
  },
  stateText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 9,
  },
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 25,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 17,
    paddingVertical: 11,
    backgroundColor: C.greenLight,
    borderRadius: 11,
    marginTop: 14,
  },
  retryButtonText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '900',
  },
  eventList: {
    gap: 12,
  },
  studentEventCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  eventDateBlock: {
    width: 62,
    minHeight: 88,
    borderRadius: 15,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  eventDateMonth: {
    color: C.green,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  eventDateDay: {
    color: C.navy,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 2,
  },
  dateCalendarIcon: {
    marginTop: 3,
  },
  eventDetails: {
    flex: 1,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C49A16',
  },
  upcomingPill: {
    backgroundColor: C.yellowLight,
  },
  ongoingPill: {
    backgroundColor: C.greenLight,
  },
  endedPill: {
    backgroundColor: C.redLight,
  },
  scheduledPill: {
    backgroundColor: C.blueLight,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
  },
  upcomingText: {
    color: '#8B6900',
  },
  ongoingText: {
    color: C.green,
  },
  endedText: {
    color: C.red,
  },
  scheduledText: {
    color: '#3C65A0',
  },
  ongoingDot: {
    backgroundColor: C.green,
  },
  endedDot: {
    backgroundColor: C.red,
  },
  eventTitle: {
    color: C.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    marginBottom: 7,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  eventInfoText: {
    color: C.muted,
    fontSize: 10,
    flexShrink: 1,
  },
  historyLink: {
    backgroundColor: C.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginTop: 18,
  },
  historyLinkIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: C.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '900',
  },
  rowDescription: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 21,
    paddingHorizontal: 2,
  },
  footerNoteText: {
    flex: 1,
    color: C.muted,
    fontSize: 11,
    lineHeight: 18,
  },
  teacherGreetingBlock: {
    marginTop: 30,
  },
  teacherGreeting: {
    color: C.white,
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  teacherDescription: {
    color: '#C3CFDA',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
  },
  createEventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.yellow,
    padding: 14,
    borderRadius: 17,
    marginTop: 23,
  },
  createEventIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#FFE99B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createEventTitle: {
    color: C.navy,
    fontSize: 13,
    fontWeight: '900',
  },
  createEventSubtitle: {
    color: '#66592F',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  teacherContent: {
    paddingHorizontal: 19,
    paddingTop: 24,
  },
  teacherSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 11,
    marginTop: 16,
    marginBottom: 27,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  summaryIconYellow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.yellowLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  summaryIconBlue: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  summaryLabel: {
    color: C.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: C.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 5,
  },
  summaryCaption: {
    color: C.muted,
    fontSize: 9,
    marginTop: 3,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 95,
    backgroundColor: C.border,
    marginHorizontal: 5,
  },
  toolCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  toolIconGreen: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconYellow: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: C.yellowLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '900',
  },
  toolDescription: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  teacherEventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 29,
    marginBottom: 15,
  },
  viewAllText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '900',
  },
  teacherEventCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teacherEventIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherEventDetails: {
    flex: 1,
  },
  teacherEventTitle: {
    color: C.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
    marginBottom: 3,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.green,
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },
  createButtonText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '900',
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 19,
    marginTop: 8,
  },
  profileLinkText: {
    flex: 1,
    color: C.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});