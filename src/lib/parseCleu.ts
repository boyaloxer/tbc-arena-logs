import type { ActorRef, CombatEvent, EventKind } from "../types";
import { splitCleuFields } from "./csv";
import { parseFlags } from "./flags";
import { parseLogTimestamp } from "./parseTime";

function actor(guid: string | undefined, name: string | undefined, flagsRaw: string | undefined): ActorRef | null {
  if (!guid || guid === "0000000000000000" || guid === "nil") return null;
  return {
    guid,
    name: name && name !== "nil" ? name : guid,
    flags: parseFlags(flagsRaw),
  };
}

function kindOf(subEvent: string): EventKind {
  if (subEvent === "SPELL_CAST_SUCCESS" || subEvent === "RANGE_CAST_SUCCESS") return "cast";
  if (subEvent === "SPELL_CAST_START") return "cast_start";
  if (subEvent === "SPELL_AURA_APPLIED" || subEvent === "SPELL_AURA_APPLIED_DOSE") return "aura_apply";
  if (subEvent === "SPELL_AURA_REMOVED" || subEvent === "SPELL_AURA_REMOVED_DOSE") return "aura_remove";
  if (subEvent === "SPELL_AURA_REFRESH") return "aura_refresh";
  if (subEvent.endsWith("_DAMAGE") || subEvent === "SWING_DAMAGE") return "damage";
  if (subEvent.endsWith("_HEAL") || subEvent === "SPELL_HEAL" || subEvent === "SPELL_PERIODIC_HEAL") return "heal";
  if (subEvent.endsWith("_MISSED") || subEvent === "SWING_MISSED") return "miss";
  if (subEvent === "UNIT_DIED" || subEvent === "PARTY_KILL" || subEvent === "UNIT_DESTROYED") return "death";
  if (subEvent === "SPELL_INTERRUPT") return "interrupt";
  if (subEvent === "SPELL_DISPEL" || subEvent === "SPELL_STOLEN") return "dispel";
  if (subEvent === "SPELL_SUMMON") return "summon";
  if (subEvent === "ZONE_CHANGE" || subEvent === "MAP_CHANGE") return "zone";
  return "other";
}

function num(v: string | undefined): number | null {
  if (v == null || v === "" || v === "nil") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Classic / TBC Anniversary advanced combat log line:
 *   TIMESTAMP  SUBEVENT,sourceGUID,"name",flags,raidFlags,destGUID,"dest",dFlags,dRaidFlags,...
 */
export function parseCleuLine(line: string, id: number): CombatEvent | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("COMBAT_LOG_VERSION") || trimmed.startsWith("//")) {
    return null;
  }

  // Timestamp and event are separated by two spaces (Blizzard format).
  const sep = trimmed.search(/\s{2,}/);
  if (sep < 0) return null;
  const rawTime = trimmed.slice(0, sep).trim();
  const rest = trimmed.slice(sep).trim();
  const fields = splitCleuFields(rest);
  if (fields.length < 1) return null;

  const subEvent = fields[0];
  const ts = parseLogTimestamp(rawTime);
  if (ts == null) return null;

  const base: CombatEvent = {
    id,
    ts,
    rawTime,
    rawLine: trimmed,
    kind: kindOf(subEvent),
    subEvent,
    source: null,
    target: null,
    spellId: null,
    spellName: null,
    spellSchool: null,
    auraType: null,
    amount: null,
    extraSpellId: null,
    extraSpellName: null,
    zoneName: null,
    mapId: null,
  };

  if (subEvent === "ZONE_CHANGE" || subEvent === "MAP_CHANGE") {
    // ZONE_CHANGE,mapId,"zoneName"  OR sometimes just ,"zoneName"
    base.mapId = num(fields[1]);
    base.zoneName = fields[2] || fields[1] || null;
    return base;
  }

  if (fields.length < 9) {
    // UNIT_DIED etc. still have dest in classic: EVENT,sGUID,sName,sFlags,sRF,dGUID,dName,dFlags,dRF
    if (fields.length >= 8) {
      base.source = actor(fields[1], fields[2], fields[3]);
      base.target = actor(fields[5], fields[6], fields[7]);
    }
    return base;
  }

  base.source = actor(fields[1], fields[2], fields[3]);
  base.target = actor(fields[5], fields[6], fields[7]);

  const isSwing = subEvent.startsWith("SWING_");
  const isEnv = subEvent.startsWith("ENVIRONMENTAL_");
  let i = 9;

  if (!isSwing && !isEnv && subEvent !== "UNIT_DIED" && subEvent !== "PARTY_KILL") {
    base.spellId = num(fields[i]);
    base.spellName = fields[i + 1] ?? null;
    base.spellSchool = num(fields[i + 2]);
    i += 3;
  } else if (isSwing) {
    base.spellId = 0;
    base.spellName = "Melee";
    base.spellSchool = 1;
  }

  if (subEvent.includes("AURA_")) {
    const aura = (fields[i] || "").toUpperCase();
    base.auraType = aura === "BUFF" || aura === "DEBUFF" ? aura : null;
  }

  if (subEvent === "SPELL_INTERRUPT" || subEvent === "SPELL_DISPEL" || subEvent === "SPELL_STOLEN") {
    base.extraSpellId = num(fields[i]);
    base.extraSpellName = fields[i + 1] ?? null;
  }

  if (
    subEvent.endsWith("_DAMAGE") ||
    subEvent.endsWith("_HEAL") ||
    subEvent === "SPELL_HEAL" ||
    subEvent === "SPELL_PERIODIC_HEAL"
  ) {
    // Without advanced logging, amount is first suffix field after spell prefix / aura.
    // With advanced logging there are many fields first — try last numeric cluster.
    // Heuristic: first numeric after spell prefix that looks like amount.
    for (let j = i; j < Math.min(fields.length, i + 20); j++) {
      const v = num(fields[j]);
      if (v != null && v >= 0 && fields[j] !== "" && !fields[j].includes("-") && fields[j] !== "nil") {
        // skip obvious GUIDs / hex schools already parsed
        if (/^0x/i.test(fields[j])) continue;
        if (fields[j].startsWith("Player-") || fields[j].startsWith("Creature-")) continue;
        base.amount = v;
        break;
      }
    }
  }

  return base;
}

export function parseCombatLog(text: string): CombatEvent[] {
  const lines = text.split(/\r?\n/);
  const events: CombatEvent[] = [];
  let id = 0;
  for (const line of lines) {
    const ev = parseCleuLine(line, id);
    if (ev) {
      events.push(ev);
      id += 1;
    }
  }
  return events;
}
