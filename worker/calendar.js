const MAX_KEY_DATES = 8;

function unfoldLines(text) {
  const lines = [];
  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    if ((rawLine.startsWith(" ") || rawLine.startsWith("\t")) && lines.length) {
      lines[lines.length - 1] += rawLine.slice(1);
    } else {
      lines.push(rawLine);
    }
  }
  return lines;
}

function unescapeText(value) {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

// DTSTART/DTEND values are either an all-day date ("20260707") or a UTC
// timestamp ("20240226T020000Z") — Google's ICS export doesn't emit floating
// (no-Z) local times for this kind of calendar, so that case isn't handled.
function parseDateValue(value) {
  if (/^\d{8}$/.test(value)) {
    return { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, allDay: true };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return { date: `${y}-${mo}-${d}T${h}:${mi}:${s}Z`, allDay: false };
}

function parseIcs(text) {
  const events = [];
  let current = null;

  for (const line of unfoldLines(text)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).split(";")[0];
    const value = line.slice(colonIdx + 1);

    switch (key) {
      case "SUMMARY":
        current.title = unescapeText(value);
        break;
      case "LOCATION":
        current.location = unescapeText(value);
        break;
      case "DESCRIPTION":
        current.description = unescapeText(value);
        break;
      case "STATUS":
        current.status = value;
        break;
      case "DTSTART":
        current.start = parseDateValue(value);
        break;
      case "DTEND":
        current.end = parseDateValue(value);
        break;
    }
  }
  return events;
}

function todayInPacific() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isUpcoming(event, today, now) {
  const boundary = event.end || event.start;
  if (!boundary) return false;
  return boundary.allDay ? boundary.date >= today : new Date(boundary.date) >= now;
}

export async function getKeyDates(env) {
  const raw = await env.SITE_CONFIG.get("calendar-config");
  const config = raw ? JSON.parse(raw) : null;
  if (!config || !config.icsUrl) return [];

  const res = await fetch(config.icsUrl, { cf: { cacheTtl: 1800, cacheEverything: true } });
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
  const text = await res.text();

  const today = todayInPacific();
  const now = new Date();
  const maxEvents = config.maxEvents || MAX_KEY_DATES;

  return parseIcs(text)
    .filter((e) => e.title && e.start && e.status !== "CANCELLED")
    .filter((e) => isUpcoming(e, today, now))
    .sort((a, b) => a.start.date.localeCompare(b.start.date))
    .slice(0, maxEvents)
    .map((e) => ({
      title: e.title,
      location: e.location || null,
      description: e.description || null,
      start: e.start.date,
      end: e.end ? e.end.date : null,
      allDay: e.start.allDay,
    }));
}
