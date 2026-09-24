import { supabase } from './supabase';

export type AttendanceRecord = {
  id: number;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

type EventPayload = {
  v: number;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  let payload: EventPayload;

  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return { success: false, message: 'Invalid QR code.' };
  }

  if (payload.v !== 1 || !payload.event) {
    return { success: false, message: 'Not an attendance QR code.' };
  }

  const now = Date.now();
  const start = payload.start ? new Date(payload.start).getTime() : null;
  const end = payload.end ? new Date(payload.end).getTime() : null;

  if (start && now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
    };
  }

  if (end && now > end) {
    return {
      success: false,
      message: 'Event has already ended.',
    };
  }

  const title = payload.title ?? payload.event;

  const { data: existingEvent, error: eventError } = await supabase
    .from('events')
    .select('event_code, title, start_time, end_time')
    .eq('event_code', payload.event)
    .maybeSingle();

  if (eventError) {
    console.error('EVENT CHECK ERROR:', eventError);

    return {
      success: false,
      message: 'Failed to check event.',
    };
  }

  if (!existingEvent) {
    const { error: createEventError } = await supabase
      .from('events')
      .insert({
        event_code: payload.event,
        title,
        start_time: payload.start ?? null,
        end_time: payload.end ?? null,
      });

    if (createEventError) {
      console.error('CREATE EVENT ERROR:', createEventError);

      return {
        success: false,
        message: 'Failed to save event.',
      };
    }
  }

  const { error: attendanceError } = await supabase
    .from('attendance')
    .insert({
      student_id: studentId,
      event_code: payload.event,
      scanned_at: new Date().toISOString(),
    });

  if (attendanceError) {
    console.error('ATTENDANCE INSERT ERROR:', attendanceError);

    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: title,
      };
    }

    return {
      success: false,
      message: 'Failed to record attendance.',
      eventTitle: title,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: title,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data: attendanceRows, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, event_code, scanned_at')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (attendanceError) {
    console.error('GET ATTENDANCE HISTORY ERROR:', attendanceError);
    return [];
  }

  if (!attendanceRows || attendanceRows.length === 0) {
    return [];
  }

  const eventCodes = [
    ...new Set(attendanceRows.map((row) => row.event_code)),
  ];

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('event_code, title')
    .in('event_code', eventCodes);

  if (eventsError) {
    console.error('GET EVENTS FOR HISTORY ERROR:', eventsError);

    return attendanceRows.map((row) => ({
      id: row.id,
      eventId: row.event_code,
      eventTitle: row.event_code,
      scannedAt: row.scanned_at,
    }));
  }

  const eventTitleMap = new Map<string, string>();

  for (const event of events ?? []) {
    eventTitleMap.set(event.event_code, event.title);
  }

  return attendanceRows.map((row) => ({
    id: row.id,
    eventId: row.event_code,
    eventTitle:
      eventTitleMap.get(row.event_code) ?? row.event_code,
    scannedAt: row.scanned_at,
  }));
}