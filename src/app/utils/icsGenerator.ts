export interface ScheduleItem {
  courseCode: string;
  courseName?: string;
  day: string;
  time: string;
  venue: string;
}

export interface ICSOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  enableNotification: boolean;
}

const DAY_MAP: Record<string, { byDay: string; dayIndex: number }> = {
  Sunday: { byDay: "SU", dayIndex: 0 },
  Monday: { byDay: "MO", dayIndex: 1 },
  Tuesday: { byDay: "TU", dayIndex: 2 },
  Wednesday: { byDay: "WE", dayIndex: 3 },
  Thursday: { byDay: "TH", dayIndex: 4 },
  Friday: { byDay: "FR", dayIndex: 5 },
  Saturday: { byDay: "SA", dayIndex: 6 },
};

/**
 * Helper to parse time strings like "08:00 - 10:00", "8:00am - 10:00am", "14:00-16:00", "8am - 10am"
 */
function parseTimeRange(timeStr: string): { startHour: number; startMinute: number; endHour: number; endMinute: number } | null {
  if (!timeStr) return null;

  const parts = timeStr.split(/\s*-\s*|\s*to\s*/i);
  if (parts.length !== 2) return null;

  const parseTimePart = (part: string) => {
    const cleaned = part.trim().toLowerCase();
    const isPm = cleaned.includes("pm");
    const isAm = cleaned.includes("am");
    const numPart = cleaned.replace(/[^\d:]/g, "");
    const timeComponents = numPart.split(":");

    let hour = parseInt(timeComponents[0], 10);
    let minute = timeComponents[1] ? parseInt(timeComponents[1], 10) : 0;

    if (isNaN(hour)) return null;
    if (isNaN(minute)) minute = 0;

    if (isPm && hour < 12) hour += 12;
    if (isAm && hour === 12) hour = 0;

    return { hour, minute };
  };

  const start = parseTimePart(parts[0]);
  const end = parseTimePart(parts[1]);

  if (!start || !end) return null;

  return {
    startHour: start.hour,
    startMinute: start.minute,
    endHour: end.hour,
    endMinute: end.minute,
  };
}

/**
 * Format Date object to ICS UTC/Local string YYYYMMDDTHHMMSS
 */
function formatICSDateTime(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Format Date object to ICS UNTIL date string YYYYMMDDTHHMMSSZ (in UTC)
 */
function formatICSUntilDateTime(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Calculate the first occurrence date for a given day of week on or after startSemesterDate
 */
function getFirstOccurrence(startSemesterDate: Date, targetDayIndex: number): Date {
  const result = new Date(startSemesterDate);
  const currentDayIndex = result.getDay(); // 0 is Sunday, 1 is Monday ...
  let diff = targetDayIndex - currentDayIndex;
  if (diff < 0) {
    diff += 7;
  }
  result.setDate(result.getDate() + diff);
  return result;
}

/**
 * Generates ICS file content as a string
 */
export function generateICS(schedule: ScheduleItem[], options: ICSOptions): string {
  const [startYear, startMonth, startDayNum] = options.startDate.split("-").map(Number);
  const [endYear, endMonth, endDayNum] = options.endDate.split("-").map(Number);

  const startSemesterDate = new Date(startYear, startMonth - 1, startDayNum, 0, 0, 0);
  // Set end semester date to end of day
  const endSemesterDate = new Date(endYear, endMonth - 1, endDayNum, 23, 59, 59);

  const nowString = formatICSDateTime(new Date());

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AutoClass//Academic Schedule Calendar Generator//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:AutoClass Academic Schedule",
  ];

  schedule.forEach((item, index) => {
    const dayInfo = DAY_MAP[item.day];
    if (!dayInfo) return;

    const times = parseTimeRange(item.time);
    if (!times) return;

    // Determine first date for this class
    const firstClassDate = getFirstOccurrence(startSemesterDate, dayInfo.dayIndex);

    const eventStartDate = new Date(firstClassDate);
    eventStartDate.setHours(times.startHour, times.startMinute, 0, 0);

    const eventEndDate = new Date(firstClassDate);
    eventEndDate.setHours(times.endHour, times.endMinute, 0, 0);

    // If start time is after end time, assume class goes to next day (rare)
    if (eventEndDate <= eventStartDate) {
      eventEndDate.setDate(eventEndDate.getDate() + 1);
    }

    const uid = `autoclass-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}@autoclass`;
    const summary = item.courseName ? `${item.courseCode} - ${item.courseName}` : item.courseCode;
    const untilString = formatICSUntilDateTime(endSemesterDate);

    icsContent.push("BEGIN:VEVENT");
    icsContent.push(`UID:${uid}`);
    icsContent.push(`DTSTAMP:${nowString}`);
    icsContent.push(`DTSTART:${formatICSDateTime(eventStartDate)}`);
    icsContent.push(`DTEND:${formatICSDateTime(eventEndDate)}`);
    icsContent.push(`RRULE:FREQ=WEEKLY;UNTIL=${untilString};BYDAY=${dayInfo.byDay}`);
    icsContent.push(`SUMMARY:${summary.replace(/,/g, "\\,").replace(/;/g, "\\;")}`);
    if (item.venue) {
      icsContent.push(`LOCATION:${item.venue.replace(/,/g, "\\,").replace(/;/g, "\\;")}`);
    }
    icsContent.push(`DESCRIPTION:Class schedule for ${summary}`);

    if (options.enableNotification) {
      icsContent.push("BEGIN:VALARM");
      icsContent.push("ACTION:DISPLAY");
      icsContent.push("DESCRIPTION:Class Reminder");
      icsContent.push("TRIGGER:-PT15M");
      icsContent.push("END:VALARM");
    }

    icsContent.push("END:VEVENT");
  });

  icsContent.push("END:VCALENDAR");

  return icsContent.join("\r\n");
}

/**
 * Triggers browser download/opening of .ics file
 */
export function downloadICSFile(icsContent: string, filename = "AutoClass-Schedule.ics") {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
