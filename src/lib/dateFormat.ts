export function formatDateDisplay(input: string | Date, mode: "full" | "short" = "full"): string {
  const date =
    typeof input === "string"
      ? new Date(input.includes("T") ? input : `${input}T00:00:00`)
      : new Date(input);

  if (Number.isNaN(date.getTime())) {
    return typeof input === "string" ? input : "";
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  if (mode === "short") {
    return `${dd}/${mm}`;
  }

  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Converts 24h time format (HH:MM) to 12h format with AM/PM
 * @param time24 - Time in 24h format (e.g., "14:30", "09:00")
 * @returns Time in 12h format (e.g., "2:30 PM", "9:00 AM")
 */
export function formatTime12h(time24: string | undefined | null): string {
  if (!time24) return "";

  const [hoursStr, minutesStr] = time24.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || "00";

  if (isNaN(hours)) return time24;

  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${hours12}:${minutes} ${period}`;
}

/**
 * Formats a time range from 24h to 12h format
 * @param startTime - Start time in 24h format
 * @param endTime - End time in 24h format
 * @returns Formatted range (e.g., "9:00 AM - 2:30 PM")
 */
export function formatTimeRange12h(startTime: string | undefined | null, endTime: string | undefined | null): string {
  const start = formatTime12h(startTime);
  const end = formatTime12h(endTime);

  if (!start && !end) return "";
  if (!end) return start;
  if (!start) return end;

  return `${start} - ${end}`;
}
