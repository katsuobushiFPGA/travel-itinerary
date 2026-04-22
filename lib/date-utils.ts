import { differenceInCalendarDays, format, parseISO } from "date-fns";

export function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "yyyy-MM-dd");
}

export function formatTripRange(start: Date, end: Date): string {
  const startStr = format(start, "yyyy/MM/dd");
  const endStr = format(end, "yyyy/MM/dd");
  return startStr === endStr ? startStr : `${startStr} — ${endStr}`;
}

export function tripDurationDays(start: Date, end: Date): number {
  return differenceInCalendarDays(end, start) + 1;
}
