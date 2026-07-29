/**
 * Parse WoW combat-log timestamps into a comparable ms value.
 * Supports:
 *   7/29/2026 17:00:01.123
 *   7/29 17:00:01.123
 */
export function parseLogTimestamp(raw: string, assumeYear = 2026): number | null {
  const m = raw
    .trim()
    .match(
      /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/,
    );
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  let year = m[3] ? Number(m[3]) : assumeYear;
  if (year < 100) year += 2000;
  const hour = Number(m[4]);
  const min = Number(m[5]);
  const sec = Number(m[6]);
  const ms = m[7] ? Number(m[7].padEnd(3, "0")) : 0;
  return Date.UTC(year, month - 1, day, hour, min, sec, ms);
}
