import { describe, expect, it } from "vitest";
import fixture from "../fixtures/sample-arena.log?raw";
import { parseCombatLog } from "./parseCleu";
import { parseArenaLog } from "./parseLog";
import { splitArenaMatches } from "./splitArenas";

describe("parseCombatLog", () => {
  it("parses cast and aura lines from the fixture", () => {
    const events = parseCombatLog(fixture);
    expect(events.length).toBeGreaterThan(10);
    const cast = events.find((e) => e.kind === "cast" && e.spellName === "Corruption");
    expect(cast?.source?.name).toContain("Dotkill");
    expect(cast?.target?.name).toContain("Stabby");
    const aura = events.find((e) => e.kind === "aura_apply" && e.spellName === "Garrote");
    expect(aura?.auraType).toBe("DEBUFF");
  });
});

describe("splitArenaMatches", () => {
  it("detects Nagrand Arena via ZONE_CHANGE", () => {
    const events = parseCombatLog(fixture);
    const matches = splitArenaMatches(events);
    expect(matches).toHaveLength(1);
    expect(matches[0].map).toBe("Nagrand Arena");
    expect(matches[0].players.length).toBeGreaterThanOrEqual(4);
    expect(matches[0].timeline.some((r) => r.spellName === "Corruption")).toBe(true);
    expect(matches[0].timeline.some((r) => r.spellName === "Garrote")).toBe(true);
    expect(matches[0].deathOrder[0]?.name).toBe("Stabby");
  });
});

describe("parseArenaLog", () => {
  it("returns a full ParseResult with per-match log text", () => {
    const result = parseArenaLog(fixture);
    expect(result.warnings).toHaveLength(0);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].index).toBe(1);
    expect(result.matches[0].timeline.length).toBeGreaterThan(0);
    expect(result.matches[0].logText).toContain("SPELL_CAST_SUCCESS");
    expect(result.matches[0].logText).toContain("Match 1");
  });
});
