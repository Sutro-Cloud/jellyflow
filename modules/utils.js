export function normalizeUrl(url) {
  return url.replace(/\/+$/, "");
}

export function formatRuntime(ticks) {
  if (!ticks) {
    return "--:--";
  }
  const totalSeconds = Math.floor(ticks / 10000000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ticksToSeconds(ticks) {
  return Number(ticks) / 10000000;
}

export function parseTimeToSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (!value) {
    return null;
  }
  const text = value.toString().trim();
  const match = text.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) {
    return null;
  }
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const fraction = match[4] ? Number(`0.${match[4]}`) : 0;
  if (![hours, minutes, seconds, fraction].every(Number.isFinite)) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds + fraction;
}

export function normalizeStartValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  if (number > 100000) {
    return ticksToSeconds(number);
  }
  return number;
}

export function placeholderText(name) {
  const clean = typeof name === "string" ? name.trim() : "";
  if (!clean) {
    return "??";
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  const initials = `${first}${second}`.toUpperCase();
  return initials || "??";
}
