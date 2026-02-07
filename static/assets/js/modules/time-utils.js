export function formatTime(date, timezone) {
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
    timeZone: timezone,
  }).format(date);

  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(date);

  return `${dateStr}, ${timeStr}`;
}

export function getTimezoneOffset(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });
  return formatter.format(date).split(" ").pop();
}

export function getUniqueTimezones(date, timezones) {
  const seen = new Map();
  timezones.forEach((tz) => {
    const offset = getTimezoneOffset(date, tz);
    if (!seen.has(offset)) {
      seen.set(offset, tz);
    }
  });
  return Array.from(seen.values());
}

export function getSolarTime(date, lng) {
  const offsetMinutes = lng * 4;
  const solarDate = new Date(date.getTime() + offsetMinutes * 60000);
  return solarDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}
