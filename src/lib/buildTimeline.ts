import type { CombatEvent, TimelineRow, TimelineSegment } from "../types";
import { isPlayerGuid } from "./flags";
import { buildPetOwnerMap, resolveActorOwner } from "./petOwners";

const AURA_KINDS = new Set(["aura_apply", "aura_remove", "aura_refresh", "aura_dose"]);

function shortName(name: string): string {
  const i = name.indexOf("-");
  return i > 0 ? name.slice(0, i) : name;
}

export function buildTimeline(events: CombatEvent[], matchStartTs: number): TimelineRow[] {
  const rows = new Map<string, TimelineRow>();
  /** Open aura bars: key = source|target|spellId */
  const openAuras = new Map<string, TimelineSegment>();
  const petOwners = buildPetOwnerMap(events);

  const ensureRow = (
    spellId: number | null,
    spellName: string,
    school: number | null,
    sourceGuid: string,
    sourceName: string,
  ): TimelineRow => {
    const key = `${sourceGuid}|${spellId ?? "x"}|${spellName}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        spellId,
        spellName,
        school,
        sourceGuid,
        sourceName,
        segments: [],
      };
      rows.set(key, row);
    }
    return row;
  };

  for (const ev of events) {
    const rawSrc = ev.source;
    if (!rawSrc || !ev.spellName) continue;

    // Attribute pet abilities (Sacrifice, etc.) to the summoning player.
    const resolved = resolveActorOwner(rawSrc.guid, rawSrc.name, petOwners);
    const srcGuid = resolved.guid;
    const srcName = shortName(resolved.name);

    // Keep player-owned rows; drop unowned NPC noise (totems still summon→creature).
    if (!isPlayerGuid(srcGuid)) continue;

    const offset = ev.ts - matchStartTs;
    if (offset < 0) continue;

    const displaySource =
      resolved.petName != null ? `${srcName} (${shortName(resolved.petName)})` : srcName;

    if (ev.kind === "cast" && ev.spellName) {
      const row = ensureRow(ev.spellId, ev.spellName, ev.spellSchool, srcGuid, srcName);
      row.segments.push({
        startMs: offset,
        endMs: null,
        eventId: ev.id,
        sourceGuid: srcGuid,
        sourceName: displaySource,
        targetGuid: ev.target?.guid ?? null,
        targetName: ev.target ? shortName(ev.target.name) : null,
        kind: "cast",
      });
    }

    if (AURA_KINDS.has(ev.kind) && ev.spellName) {
      const tgt = ev.target?.guid ?? "unknown";
      const auraKey = `${srcGuid}|${tgt}|${ev.spellId ?? ev.spellName}`;
      const row = ensureRow(ev.spellId, ev.spellName, ev.spellSchool, srcGuid, srcName);

      if (ev.kind === "aura_apply" || ev.kind === "aura_refresh" || ev.kind === "aura_dose") {
        const existing = openAuras.get(auraKey);
        if (existing && existing.endMs == null) {
          existing.eventId = ev.id;
        } else {
          const seg: TimelineSegment = {
            startMs: offset,
            endMs: null,
            eventId: ev.id,
            sourceGuid: srcGuid,
            sourceName: displaySource,
            targetGuid: ev.target?.guid ?? null,
            targetName: ev.target ? shortName(ev.target.name) : null,
            kind: "aura",
          };
          openAuras.set(auraKey, seg);
          row.segments.push(seg);
        }
      } else if (ev.kind === "aura_remove") {
        const existing = openAuras.get(auraKey);
        if (existing) {
          existing.endMs = offset;
          openAuras.delete(auraKey);
        }
      }
    }
  }

  const last = events.length ? events[events.length - 1].ts - matchStartTs : 0;
  for (const seg of openAuras.values()) {
    if (seg.endMs == null) seg.endMs = Math.max(last, seg.startMs);
  }

  return [...rows.values()]
    .filter((r) => r.segments.length > 0)
    .sort((a, b) => {
      const a0 = a.segments[0]?.startMs ?? 0;
      const b0 = b.segments[0]?.startMs ?? 0;
      if (a0 !== b0) return a0 - b0;
      return a.spellName.localeCompare(b.spellName);
    });
}
