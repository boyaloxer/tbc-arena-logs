import type { Match, Player } from "../types";

export interface CoordSeries {
  guid: string;
  name: string;
  className: string | null;
  side: Player["side"];
  /** Damage per time bucket (same length as bucketStartsMs). */
  buckets: number[];
  total: number;
  color: string;
}

export interface CoordChart {
  targetGuid: string;
  targetName: string;
  bucketMs: number;
  /** Offset from match start for each bucket. */
  bucketStartsMs: number[];
  series: CoordSeries[];
  /** Max stacked DPS across buckets (for Y scale). */
  maxStackDps: number;
}

const CLASS_COLORS: Record<string, string> = {
  Warrior: "#c79c6e",
  Paladin: "#f58cba",
  Hunter: "#abd473",
  Rogue: "#fff569",
  Priest: "#ffffff",
  Shaman: "#0070de",
  Mage: "#69ccf0",
  Warlock: "#9482c9",
  Druid: "#ff7d0a",
};

const FALLBACK = ["#e05c7a", "#5cb8e0", "#8fdc6b", "#c9b896", "#b8a8ed", "#e89b8c", "#93ecf6", "#f0dca0"];

function shortName(name: string): string {
  const i = name.indexOf("-");
  return i > 0 ? name.slice(0, i) : name;
}

/**
 * Build a stacked DPS-over-time series: all sources damaging one target.
 * This is the "coordination / focus fire" view.
 */
export function buildCoordinationChart(
  match: Match,
  targetGuid: string,
  opts?: { bucketMs?: number; sourceGuid?: string | "all" },
): CoordChart | null {
  const bucketMs = opts?.bucketMs ?? 1000;
  const sourceFilter = opts?.sourceGuid ?? "all";
  const target = match.players.find((p) => p.guid === targetGuid);
  const targetName = target?.name ?? shortName(
    match.events.find((e) => e.target?.guid === targetGuid)?.target?.name ?? "Target",
  );

  const durationMs = Math.max(match.durationMs, bucketMs);
  const nBuckets = Math.max(1, Math.ceil(durationMs / bucketMs));
  const bucketStartsMs = Array.from({ length: nBuckets }, (_, i) => i * bucketMs);

  const bySource = new Map<string, { name: string; className: string | null; side: Player["side"]; buckets: number[] }>();

  for (const ev of match.events) {
    if (ev.kind !== "damage" || !ev.amount || ev.amount <= 0) continue;
    if (!ev.source || !ev.target) continue;
    if (ev.target.guid !== targetGuid) continue;
    if (sourceFilter !== "all" && ev.source.guid !== sourceFilter) continue;

    const roster = match.players.find((p) => p.guid === ev.source!.guid);
    const guid = ev.source.guid;
    let row = bySource.get(guid);
    if (!row) {
      row = {
        name: roster?.name ?? shortName(ev.source.name),
        className: roster?.className ?? null,
        side: roster?.side ?? "unknown",
        buckets: Array(nBuckets).fill(0),
      };
      bySource.set(guid, row);
    }
    const offset = ev.ts - match.startTs;
    let idx = Math.floor(offset / bucketMs);
    if (idx < 0) idx = 0;
    if (idx >= nBuckets) idx = nBuckets - 1;
    row.buckets[idx] += ev.amount;
  }

  if (!bySource.size) return null;

  // Convert bucket damage → DPS for that window
  const series: CoordSeries[] = [...bySource.entries()]
    .map(([guid, row], i) => {
      const dpsBuckets = row.buckets.map((dmg) => dmg / (bucketMs / 1000));
      const total = row.buckets.reduce((a, b) => a + b, 0);
      const color =
        (row.className && CLASS_COLORS[row.className]) || FALLBACK[i % FALLBACK.length];
      return {
        guid,
        name: row.name,
        className: row.className,
        side: row.side,
        buckets: dpsBuckets,
        total,
        color,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);

  if (!series.length) return null;

  let maxStackDps = 0;
  for (let b = 0; b < nBuckets; b++) {
    let stack = 0;
    for (const s of series) stack += s.buckets[b] ?? 0;
    if (stack > maxStackDps) maxStackDps = stack;
  }

  return {
    targetGuid,
    targetName,
    bucketMs,
    bucketStartsMs,
    series,
    maxStackDps: Math.max(maxStackDps, 1),
  };
}

/** Prefer an enemy when suggesting a default focus target. */
export function defaultCoordinationTarget(match: Match): string | null {
  const enemies = match.players.filter((p) => !p.isPet && p.side === "enemy");
  if (enemies.length) {
    // Enemy who took the most damage
    const dmg = new Map<string, number>();
    for (const ev of match.events) {
      if (ev.kind !== "damage" || !ev.target || !ev.amount) continue;
      if (!enemies.some((e) => e.guid === ev.target!.guid)) continue;
      dmg.set(ev.target.guid, (dmg.get(ev.target.guid) ?? 0) + ev.amount);
    }
    let best: string | null = null;
    let bestAmt = -1;
    for (const [g, a] of dmg) {
      if (a > bestAmt) {
        bestAmt = a;
        best = g;
      }
    }
    return best ?? enemies[0].guid;
  }
  const any = match.players.find((p) => !p.isPet);
  return any?.guid ?? null;
}
