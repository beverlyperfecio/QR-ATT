import { supabase } from './supabase';
import { parseQRPayload } from './qr';
import { getEventByCode } from './events';

export type AttendanceStatus = 'Present' | 'Late' | 'Absent';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
  status?: Exclude<AttendanceStatus, 'Absent'>;
};

export type TeacherAttendee = {
  studentId: string;
  studentName: string | null;
  scannedAt: string | null;
  status: AttendanceStatus;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: TeacherAttendee[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

const LATE_GRACE_PERIOD_MS = 10 * 60 * 1000;

function getScannedStatus(
  scannedAt: string,
  startTime: string | null
): Exclude<AttendanceStatus, 'Absent'> {
  if (!startTime) return 'Present';

  const scanned = new Date(scannedAt).getTime();
  const start = new Date(startTime).getTime();

  if (!Number.isFinite(scanned) || !Number.isFinite(start)) {
    return 'Present';
  }

  return scanned <= start + LATE_GRACE_PERIOD_MS
    ? 'Present'
    : 'Late';
}

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);

  if (!parsed.ok) {
    return {
      success: false,
      message: parsed.message,
    };
  }

  const payload = parsed.payload;
  const now = Date.now();

  const start = payload.start
    ? new Date(payload.start).getTime()
    : null;

  const end = payload.end
    ? new Date(payload.end).getTime()
    : null;

  if (start !== null && Number.isFinite(start) && now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
    };
  }

  if (end !== null && Number.isFinite(end) && now >= end) {
    return {
      success: false,
      message: 'Event has already ended.',
    };
  }

  const title = payload.title ?? payload.event;

  let event: { id: string; title: string } | null = null;

  const foundEvent = await getEventByCode(payload.event);

  if (foundEvent) {
    event = foundEvent;
  } else {
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert([
        {
          event_code: payload.event,
          title,
          start_time: payload.start ?? null,
          end_time: payload.end ?? null,
        },
      ])
      .select('id, title')
      .single();

    if (insertError || !newEvent) {
      return {
        success: false,
        message: 'Could not create event.',
      };
    }

    event = newEvent;
  }

  const { data: eventDetails } = await supabase
    .from('events')
    .select('start_time, end_time')
    .eq('id', event.id)
    .maybeSingle();

  const effectiveStart =
    eventDetails?.start_time ?? payload.start ?? null;

  const scannedAt = new Date().toISOString();

  const status = getScannedStatus(
    scannedAt,
    effectiveStart
  );

  const { error: attError } = await supabase
    .from('attendance')
    .insert([
      {
        student_id: studentId,
        event_id: event.id,
        scanned_at: scannedAt,
      },
    ]);

  if (attError) {
    if (attError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
      };
    }

    return {
      success: false,
      message: attError.message,
    };
  }

  return {
    success: true,
    message:
      status === 'Late'
        ? 'Attendance recorded — Late (more than 10 minutes after start).'
        : 'Attendance recorded — Present.',
    eventTitle: event.title,
    status,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
  }));
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    console.error(
      'Could not load teacher events:',
      eventError?.message
    );
    return [];
  }

  if (events.length === 0) return [];

  const eventIds = events.map((event: any) => event.id);

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, event_id')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attendanceError) {
    console.error(
      'Could not load event attendance:',
      attendanceError.message
    );
  }

  const attendanceRows = attendance ?? [];

  const {
    data: studentProfiles,
    error: profilesError,
  } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student');

  if (profilesError) {
    console.warn(
      'Could not load student roster for Absent status:',
      profilesError.message
    );
  }

  const profileMap: Record<string, string | null> = {};

  for (const profile of (studentProfiles ?? []) as any[]) {
    profileMap[profile.id] = profile.full_name ?? null;
  }

  const scannedStudentIds = [
    ...new Set(
      attendanceRows.map((row: any) => row.student_id as string)
    ),
  ];

  if (scannedStudentIds.length > 0) {
    const { data: scannedProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', scannedStudentIds);

    for (const profile of (scannedProfiles ?? []) as any[]) {
      profileMap[profile.id] = profile.full_name ?? null;
    }
  }

  const now = Date.now();

  return events.map((event: any) => {
    const rows = attendanceRows.filter(
      (row: any) => row.event_id === event.id
    );

    const scannedByStudent = new Map<string, any>();

    for (const row of rows) {
      const existing = scannedByStudent.get(row.student_id);

      if (
        !existing ||
        new Date(row.scanned_at).getTime() <
          new Date(existing.scanned_at).getTime()
      ) {
        scannedByStudent.set(row.student_id, row);
      }
    }

    const validEndTime = event.end_time
      ? new Date(event.end_time).getTime()
      : NaN;

    const eventEnded =
      Number.isFinite(validEndTime) && now >= validEndTime;

    const attendees: TeacherAttendee[] = [];

    for (const [studentId, row] of scannedByStudent.entries()) {
      attendees.push({
        studentId,
        studentName: profileMap[studentId] ?? null,
        scannedAt: row.scanned_at,
        status: getScannedStatus(
          row.scanned_at,
          event.start_time
        ),
      });
    }

    if (eventEnded && !profilesError && studentProfiles) {
      for (const profile of studentProfiles as any[]) {
        if (!scannedByStudent.has(profile.id)) {
          attendees.push({
            studentId: profile.id,
            studentName: profile.full_name ?? null,
            scannedAt: null,
            status: 'Absent',
          });
        }
      }
    }

    const statusOrder: Record<AttendanceStatus, number> = {
      Late: 0,
      Present: 1,
      Absent: 2,
    };

    attendees.sort((a, b) => {
      const byStatus =
        statusOrder[a.status] - statusOrder[b.status];

      if (byStatus !== 0) return byStatus;

      if (!a.scannedAt) return 1;
      if (!b.scannedAt) return -1;

      return (
        new Date(b.scannedAt).getTime() -
        new Date(a.scannedAt).getTime()
      );
    });

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: rows.length,
      attendees,
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = events.map((event: any) => event.id);

  if (eventIds.length === 0) return [];

  const { data: attendanceRows } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  const counts: Record<string, number> = {};

  (attendanceRows ?? []).forEach((row: any) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event: any) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}
