/**
 * A stand in for the calendar a care home would publish. Afrikaans titles,
 * recurring structure, and a fixed DTSTART in the past so the rules expand
 * forward into whatever today is.
 *
 * It deliberately disagrees with the family entered fixture schedule in one
 * place: tea is at 15:00 here and the family put Anna's visit at 15:00 too.
 * That collision is the ordinary case, not an edge case, and the merge has to
 * have an answer for it.
 */
export const WILLOWBROOK_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Willowbrook//Activities//AF
CALSCALE:GREGORIAN
BEGIN:VTIMEZONE
TZID:Africa/Johannesburg
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0200
TZNAME:SAST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:willowbrook-ontbyt
DTSTAMP:20240101T060000Z
DTSTART;TZID=Africa/Johannesburg:20240101T080000
DTEND;TZID=Africa/Johannesburg:20240101T090000
RRULE:FREQ=DAILY
SUMMARY:Ontbyt
END:VEVENT
BEGIN:VEVENT
UID:willowbrook-middagete
DTSTAMP:20240101T060000Z
DTSTART;TZID=Africa/Johannesburg:20240101T120000
DTEND;TZID=Africa/Johannesburg:20240101T130000
RRULE:FREQ=DAILY
SUMMARY:Middagete
END:VEVENT
BEGIN:VEVENT
UID:willowbrook-tee
DTSTAMP:20240101T060000Z
DTSTART;TZID=Africa/Johannesburg:20240101T150000
DTEND;TZID=Africa/Johannesburg:20240101T153000
RRULE:FREQ=DAILY
SUMMARY:Tee
END:VEVENT
BEGIN:VEVENT
UID:willowbrook-aandete
DTSTAMP:20240101T060000Z
DTSTART;TZID=Africa/Johannesburg:20240101T173000
DTEND;TZID=Africa/Johannesburg:20240101T183000
RRULE:FREQ=DAILY
SUMMARY:Aandete
END:VEVENT
BEGIN:VEVENT
UID:willowbrook-fisio
DTSTAMP:20240101T060000Z
DTSTART;TZID=Africa/Johannesburg:20240104T100000
DTEND;TZID=Africa/Johannesburg:20240104T104500
RRULE:FREQ=WEEKLY;BYDAY=TH
SUMMARY:Fisioterapie
END:VEVENT
BEGIN:VEVENT
UID:willowbrook-haarkapper
DTSTAMP:20240101T060000Z
DTSTART;TZID=Africa/Johannesburg:20240102T093000
DTEND;TZID=Africa/Johannesburg:20240102T103000
RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU
SUMMARY:Haarkapper
END:VEVENT
BEGIN:VEVENT
UID:willowbrook-sangkring
DTSTAMP:20240101T060000Z
DTSTART;TZID=Africa/Johannesburg:20240103T140000
DTEND;TZID=Africa/Johannesburg:20240103T150000
RRULE:FREQ=WEEKLY;BYDAY=WE
SUMMARY:Sangkring
END:VEVENT
END:VCALENDAR
`;

export const FIXTURE_CALENDAR_URL = "fixture:willowbrook";

export const FIXTURE_CALENDARS: Record<string, string> = {
  [FIXTURE_CALENDAR_URL]: WILLOWBROOK_ICS,
};
