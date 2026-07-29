/**
 * WCL timeline school palette — sampled from fresh.warcraftlogs.com
 * damage-done + healing timeline screenshots (pastel bars on black).
 */
const SCHOOL = {
  physical: "#e5ca83", // tan / khaki
  holy: "#e8da8a", // pale yellow / cream
  fire: "#e89b8c", // pastel salmon
  nature: "#cef599", // light lime (HoTs, poisons)
  frost: "#7ec8e8", // ice blue (cooler than arcane)
  shadow: "#b8a8ed", // soft lavender
  arcane: "#93ecf6", // bright sky / cyan-blue
} as const;

const LABEL = {
  physical: "#f0dca0",
  holy: "#f5e9a8",
  fire: "#f0b4a8",
  nature: "#dcffa8",
  frost: "#a8dcf0",
  shadow: "#d0c0f8",
  arcane: "#b0f4fc",
} as const;

function schoolKey(school: number | null | undefined): keyof typeof SCHOOL {
  if (!school) return "physical";
  if (school & 0x20) return "shadow";
  if (school & 0x40) return "arcane";
  if (school & 0x4) return "fire";
  if (school & 0x10) return "frost";
  if (school & 0x8) return "nature";
  if (school & 0x2) return "holy";
  if (school & 0x1) return "physical";
  return "physical";
}

export function schoolColor(school: number | null | undefined): string {
  return SCHOOL[schoolKey(school)];
}

export function schoolLabelColor(school: number | null | undefined): string {
  return LABEL[schoolKey(school)];
}

export function formatOffset(ms: number): string {
  const totalSec = Math.max(0, ms) / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  if (m <= 0) return s.toFixed(1) + "s";
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

export function formatRulerTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
