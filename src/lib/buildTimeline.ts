import type { CombatEvent, TimelineRow, TimelineSegment } from "../types";
import { isPlayerGuid } from "./flags";

const AURA_KINDS = new Set(["aura_apply", "aura_remove", "aura_refresh", "aura_dose"]);

export function buildTimeline(events: CombatEvent[], matchStartTs: number): TimelineRow[] {
  const rows = new Map<string, TimelineRow>();
  /** Open aura bars: key = source|target|spellId */
  const openAuras = new Map<string, TimelineSegment>();

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
    const src = ev.source;
    if (!src || !isPlayerGuid(src.guid)) {
      // still allow pet casts under owner-looking names if Player-
      if (!src) continue;
      if (!ev.spellName) continue;
    }
    if (!src) continue;

    const offset = ev.ts - matchStartTs;
    if (offset < 0) continue;

    if (ev.kind === "cast" && ev.spellName) {
      const row = ensureRow(ev.spellId, ev.spellName, ev.spellSchool, src.guid, src.name);
      row.segments.push({
        startMs: offset,
        endMs: null,
        eventId: ev.id,
        sourceGuid: src.guid,
        sourceName: src.name,
        targetGuid: ev.target?.guid ?? null,
        targetName: ev.target?.name ?? null,
        kind: "cast",
      });
    }

    if (AURA_KINDS.has(ev.kind) && ev.spellName) {
      const tgt = ev.target?.guid ?? "unknown";
      const auraKey = `${src.guid}|${tgt}|${ev.spellId ?? ev.spellName}`;
      const row = ensureRow(ev.spellId, ev.spellName, ev.spellSchool, src.guid, src.name);

      if (ev.kind === "aura_apply" || ev.kind === "aura_refresh" || ev.kind === "aura_dose") {
        const existing = openAuras.get(auraKey);
        if (existing && existing.endMs == null) {
          // refresh — extend in place (end still open)
          existing.eventId = ev.id;
        } else {
          const seg: TimelineSegment = {
            startMs: offset,
            endMs: null,
            eventId: ev.id,
            sourceGuid: src.guid,
            sourceName: src.name,
            targetGuid: ev.target?.guid ?? null,
            targetName: ev.target?.name ?? null,
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

  // Close auras still open at end of match window
  const last = events.length ? events[events.length - 1].ts - matchStartTs : 0;
  for (const seg of openAuras.values()) {
    if (seg.endMs == null) seg.endMs = Math.max(last, seg.startMs);
  }

  // Sort rows: by first segment time, then name
  return [...rows.values()]
    .filter((r) => r.segments.length > 0)
    .sort((a, b) => {
      const a0 = a.segments[0]?.startMs ?? 0;
      const b0 = b.segments[0]?.startMs ?? 0;
      if (a0 !== b0) return a0 - b0;
      return a.spellName.localeCompare(b.spellName);
    });
}
