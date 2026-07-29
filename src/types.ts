/** Stable match JSON shape — future hosting can store these blobs as-is. */

export type EventKind =
  | "cast"
  | "cast_start"
  | "aura_apply"
  | "aura_remove"
  | "aura_refresh"
  | "aura_dose"
  | "damage"
  | "heal"
  | "miss"
  | "death"
  | "interrupt"
  | "dispel"
  | "summon"
  | "zone"
  | "other";

export interface ActorRef {
  guid: string;
  name: string;
  flags: number;
}

export interface CombatEvent {
  id: number;
  ts: number; // ms since epoch (synthetic from log clock)
  rawTime: string;
  /** Original CLEU line (for per-match .txt export). */
  rawLine: string;
  kind: EventKind;
  subEvent: string;
  source: ActorRef | null;
  target: ActorRef | null;
  spellId: number | null;
  spellName: string | null;
  spellSchool: number | null;
  auraType: "BUFF" | "DEBUFF" | null;
  amount: number | null;
  extraSpellId: number | null;
  extraSpellName: string | null;
  zoneName: string | null;
  mapId: number | null;
}

export type PlayerSide = "friendly" | "enemy" | "unknown";

export interface Player {
  guid: string;
  name: string;
  className: string | null;
  side: PlayerSide;
  isPet: boolean;
  ownerGuid: string | null;
}

export interface TimelineSegment {
  startMs: number; // offset from match start
  endMs: number | null; // null = instant tick
  eventId: number;
  sourceGuid: string;
  sourceName: string;
  targetGuid: string | null;
  targetName: string | null;
  kind: "cast" | "aura";
}

export interface TimelineRow {
  key: string;
  spellId: number | null;
  spellName: string;
  school: number | null;
  sourceGuid: string;
  sourceName: string;
  segments: TimelineSegment[];
}

export interface PlayerStats {
  guid: string;
  damage: number;
  healing: number;
  deaths: number;
}

export interface Match {
  id: string;
  index: number; // 1-based match number within the loaded session file
  map: string;
  mapId: number | null;
  startedAt: string;
  startTs: number;
  endTs: number;
  durationMs: number;
  result: "win" | "loss" | "unknown";
  players: Player[];
  events: CombatEvent[];
  /** CLEU lines for this fight only — downloadable as its own log file. */
  logText: string;
  timeline: TimelineRow[];
  stats: PlayerStats[];
  deathOrder: { guid: string; name: string; atMs: number }[];
}

export interface ParseResult {
  events: CombatEvent[];
  matches: Match[];
  warnings: string[];
  infos: string[];
}
