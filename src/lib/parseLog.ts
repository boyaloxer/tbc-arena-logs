import type { Match, ParseResult } from "../types";
import { parseCombatLog } from "./parseCleu";
import { splitArenaMatches } from "./splitArenas";

export function parseArenaLog(text: string): ParseResult {
  const events = parseCombatLog(text);
  const matches = splitArenaMatches(events);
  const warnings: string[] = [];
  const infos: string[] = [];
  if (!events.length) warnings.push("No combat log events found. Is this a WoWCombatLog file?");
  else if (!matches.length) {
    warnings.push(
      "Parsed events but found no arena matches. Enable combat logging in an arena (/clog on), or ensure ZONE_CHANGE / PvP combat is in the file.",
    );
  } else {
    infos.push(
      `Session file split into ${matches.length} arena match${matches.length === 1 ? "" : "es"}. Select one on the left — each fight is analyzed separately.`,
    );
  }
  return { events, matches, warnings, infos };
}

export function exportMatchJson(match: Match): string {
  // Omit bulky logText duplicate of events for JSON blob size; keep events/timeline.
  const { logText: _logText, ...rest } = match;
  return JSON.stringify(rest, null, 2);
}

/** One fight as its own CLEU .txt (what you want for per-match analysis archives). */
export function exportMatchLog(match: Match): string {
  return match.logText.endsWith("\n") ? match.logText : match.logText + "\n";
}

export function matchLogFilename(match: Match): string {
  const map = match.map.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const when = match.startedAt.replace(/[^\d]+/g, "-").replace(/^-|-$/g, "");
  return `arena-match-${String(match.index).padStart(2, "0")}-${map}-${when}.txt`;
}

function downloadBlob(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMatchLog(match: Match) {
  downloadBlob(matchLogFilename(match), exportMatchLog(match), "text/plain;charset=utf-8");
}

export function downloadMatchJson(match: Match) {
  downloadBlob(
    matchLogFilename(match).replace(/\.txt$/i, ".json"),
    exportMatchJson(match),
    "application/json",
  );
}

/** Download every fight in the session as its own .txt (staggered to keep the browser happy). */
export function downloadAllMatchLogs(matches: Match[]) {
  matches.forEach((m, i) => {
    window.setTimeout(() => downloadMatchLog(m), i * 150);
  });
}
