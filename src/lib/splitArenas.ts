import type { CombatEvent, Match, Player, PlayerSide, PlayerStats } from "../types";
import { arenaName, classFromSpell, isArenaMapId } from "./classHints";
import { buildTimeline } from "./buildTimeline";
import {
  isFriendlyFlags,
  isHostileFlags,
  isPlayerGuid,
  isTypePet,
  AFFILIATION_MINE,
} from "./flags";
import { buildPetOwnerMap } from "./petOwners";

const GAP_SPLIT_MS = 90_000;
const MIN_MATCH_MS = 8_000;
const MIN_PLAYERS = 2;

function shortName(name: string): string {
  const i = name.indexOf("-");
  return i > 0 ? name.slice(0, i) : name;
}

function buildRoster(events: CombatEvent[]): Player[] {
  const map = new Map<string, Player>();
  const petOwners = buildPetOwnerMap(events);

  for (const ev of events) {
    for (const actor of [ev.source, ev.target]) {
      if (!actor || !isPlayerGuid(actor.guid)) continue;
      let p = map.get(actor.guid);
      if (!p) {
        let side: PlayerSide = "unknown";
        if (actor.flags & AFFILIATION_MINE || isFriendlyFlags(actor.flags)) side = "friendly";
        else if (isHostileFlags(actor.flags)) side = "enemy";
        p = {
          guid: actor.guid,
          name: shortName(actor.name),
          className: null,
          side,
          isPet: false,
          ownerGuid: null,
        };
        map.set(actor.guid, p);
      } else if (p.side === "unknown") {
        if (actor.flags & AFFILIATION_MINE || isFriendlyFlags(actor.flags)) p.side = "friendly";
        else if (isHostileFlags(actor.flags)) p.side = "enemy";
      }
    }

    // pets
    for (const actor of [ev.source, ev.target]) {
      if (!actor) continue;
      if (isTypePet(actor.flags) || actor.guid.startsWith("Pet-")) {
        const ownerGuid = petOwners.get(actor.guid)?.ownerGuid ?? null;
        const existing = map.get(actor.guid);
        if (!existing) {
          map.set(actor.guid, {
            guid: actor.guid,
            name: shortName(actor.name),
            className: null,
            side: isFriendlyFlags(actor.flags) ? "friendly" : isHostileFlags(actor.flags) ? "enemy" : "unknown",
            isPet: true,
            ownerGuid,
          });
        } else if (!existing.ownerGuid && ownerGuid) {
          existing.ownerGuid = ownerGuid;
        }
      }
    }

    if (ev.spellId && ev.source && isPlayerGuid(ev.source.guid)) {
      const p = map.get(ev.source.guid);
      if (p && !p.className) {
        p.className = classFromSpell(ev.spellId);
      }
    }
  }

  return [...map.values()];
}

function computeStats(events: CombatEvent[]): {
  stats: PlayerStats[];
  deathOrder: Match["deathOrder"];
  startTs: number;
} {
  const startTs = events[0]?.ts ?? 0;
  const byGuid = new Map<string, PlayerStats>();
  const deathOrder: Match["deathOrder"] = [];

  const bump = (guid: string, field: "damage" | "healing" | "deaths", n: number) => {
    let s = byGuid.get(guid);
    if (!s) {
      s = { guid, damage: 0, healing: 0, deaths: 0 };
      byGuid.set(guid, s);
    }
    s[field] += n;
  };

  for (const ev of events) {
    if (ev.kind === "damage" && ev.source && isPlayerGuid(ev.source.guid) && ev.amount) {
      bump(ev.source.guid, "damage", ev.amount);
    }
    if (ev.kind === "heal" && ev.source && isPlayerGuid(ev.source.guid) && ev.amount) {
      bump(ev.source.guid, "healing", ev.amount);
    }
    if (ev.kind === "death" && ev.target && isPlayerGuid(ev.target.guid)) {
      bump(ev.target.guid, "deaths", 1);
      deathOrder.push({
        guid: ev.target.guid,
        name: shortName(ev.target.name),
        atMs: ev.ts - startTs,
      });
    }
  }

  return { stats: [...byGuid.values()], deathOrder, startTs };
}

function inferResult(players: Player[], deathOrder: Match["deathOrder"]): Match["result"] {
  if (!deathOrder.length) return "unknown";
  const last = deathOrder[deathOrder.length - 1];
  const victim = players.find((p) => p.guid === last.guid);
  if (!victim) return "unknown";
  if (victim.side === "enemy") return "win";
  if (victim.side === "friendly") return "loss";
  return "unknown";
}

function makeMatch(events: CombatEvent[], mapId: number | null, zoneName: string | null, index: number): Match | null {
  if (events.length < 5) return null;
  const startTs = events[0].ts;
  const endTs = events[events.length - 1].ts;
  const durationMs = endTs - startTs;
  if (durationMs < MIN_MATCH_MS) return null;

  const players = buildRoster(events).filter((p) => !p.isPet);
  const playerGuids = new Set(players.map((p) => p.guid));
  const distinctCombatants = new Set<string>();
  for (const ev of events) {
    if (ev.source && playerGuids.has(ev.source.guid)) distinctCombatants.add(ev.source.guid);
    if (ev.target && playerGuids.has(ev.target.guid)) distinctCombatants.add(ev.target.guid);
  }
  if (distinctCombatants.size < MIN_PLAYERS) return null;

  const { stats, deathOrder } = computeStats(events);
  const timeline = buildTimeline(events, startTs);
  const matchIndex = index + 1;
  const map = arenaName(mapId, zoneName);
  const logText = [
    `COMBAT_LOG_VERSION,9,# TBC Arena Logs — Match ${matchIndex}: ${map}`,
    ...events.map((e) => e.rawLine).filter(Boolean),
  ].join("\n");

  return {
    id: `match-${matchIndex}-${startTs}`,
    index: matchIndex,
    map,
    mapId,
    startedAt: events[0].rawTime,
    startTs,
    endTs,
    durationMs,
    result: inferResult(players, deathOrder),
    players,
    events,
    logText,
    timeline,
    stats,
    deathOrder,
  };
}

/**
 * Split a CLEU stream into arena matches.
 * Primary: ZONE_CHANGE into known arena maps.
 * Fallback: clusters of player-vs-player combat separated by long gaps.
 */
export function splitArenaMatches(events: CombatEvent[]): Match[] {
  const matches: Match[] = [];
  let index = 0;

  // Pass 1: zone-bounded
  let current: CombatEvent[] = [];
  let inArena = false;
  let mapId: number | null = null;
  let zoneName: string | null = null;

  const flush = () => {
    if (!current.length) return;
    const m = makeMatch(current, mapId, zoneName, index);
    if (m) {
      matches.push(m);
      index += 1;
    }
    current = [];
  };

  for (const ev of events) {
    if (ev.kind === "zone") {
      const nextArena =
        isArenaMapId(ev.mapId) ||
        (!!ev.zoneName && /arena|ruins of lordaeron|nagrand|blade'?s edge/i.test(ev.zoneName));
      if (inArena && !nextArena) {
        flush();
        inArena = false;
        mapId = null;
        zoneName = null;
      }
      if (nextArena) {
        if (inArena && current.length) flush();
        inArena = true;
        mapId = ev.mapId;
        zoneName = ev.zoneName;
      }
      continue;
    }
    if (inArena) current.push(ev);
  }
  if (inArena) flush();

  if (matches.length > 0) return matches;

  // Pass 2: PvP combat clusters
  const pvp: CombatEvent[] = [];
  for (const ev of events) {
    const srcOk = ev.source && isPlayerGuid(ev.source.guid);
    const dstOk = ev.target && isPlayerGuid(ev.target.guid);
    if (srcOk || dstOk) pvp.push(ev);
  }
  if (!pvp.length) return [];

  let cluster: CombatEvent[] = [pvp[0]];
  for (let i = 1; i < pvp.length; i++) {
    const prev = pvp[i - 1];
    const ev = pvp[i];
    if (ev.ts - prev.ts > GAP_SPLIT_MS) {
      const m = makeMatch(cluster, null, "Arena (detected)", index);
      if (m) {
        matches.push(m);
        index += 1;
      }
      cluster = [ev];
    } else {
      cluster.push(ev);
    }
  }
  const last = makeMatch(cluster, null, "Arena (detected)", index);
  if (last) matches.push(last);

  return matches;
}
