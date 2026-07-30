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

  it("parses Anniversary lines with timezone offsets on the timestamp", () => {
    const snippet = [
      `7/29/2026 23:11:31.699-5  ZONE_CHANGE,559,"Nagrand Arena",0`,
      `7/29/2026 23:11:35.100-5  SPELL_CAST_SUCCESS,Player-1-AAA00001,"Dotkill-Nightslayer-US",0x511,0x0,Player-1-BBB00002,"Stabby-Nightslayer-US",0x548,0x0,27216,"Corruption",0x20`,
      `7/29/2026 23:13:30.668-5  ZONE_CHANGE,1,"Orgrimmar",0`,
    ].join("\n");
    const events = parseCombatLog(snippet);
    expect(events).toHaveLength(3);
    expect(events[0].zoneName).toBe("Nagrand Arena");
    expect(events[1].spellName).toBe("Corruption");
  });

  it("attributes Voidwalker Sacrifice to the warlock owner", () => {
    const snippet = [
      `7/29/2026 23:11:31.699-5  ZONE_CHANGE,559,"Nagrand Arena",0`,
      `7/29/2026 23:12:01.812-5  SPELL_SUMMON,Player-1-AAA00001,"Dotkill-Nightslayer-US",0x511,0x0,Pet-0-1-559-1-1860-0100A11389,"Barvhug",0x1228,0x0,697,"Summon Voidwalker",0x20`,
      `7/29/2026 23:12:30.459-5  SPELL_CAST_SUCCESS,Pet-0-1-559-1-1860-0100A11389,"Barvhug",0x1111,0x0,0000000000000000,nil,0x0,0x0,27273,"Sacrifice",0x20`,
      `7/29/2026 23:12:30.460-5  SPELL_AURA_APPLIED,Pet-0-1-559-1-1860-0100A11389,"Barvhug",0x1111,0x0,Player-1-AAA00001,"Dotkill-Nightslayer-US",0x511,0x0,27273,"Sacrifice",0x20,BUFF`,
      `7/29/2026 23:12:40.000-5  SPELL_CAST_SUCCESS,Player-1-BBB00002,"Stabby-Nightslayer-US",0x548,0x0,Player-1-AAA00001,"Dotkill-Nightslayer-US",0x511,0x0,26862,"Sinister Strike",0x1`,
      `7/29/2026 23:12:41.000-5  SPELL_CAST_SUCCESS,Player-1-AAA00001,"Dotkill-Nightslayer-US",0x511,0x0,Player-1-BBB00002,"Stabby-Nightslayer-US",0x548,0x0,27216,"Corruption",0x20`,
      `7/29/2026 23:13:30.668-5  ZONE_CHANGE,1,"Orgrimmar",0`,
    ].join("\n");
    const { matches } = parseArenaLog(snippet);
    expect(matches).toHaveLength(1);
    const sac = matches[0].timeline.find((r) => r.spellName === "Sacrifice");
    expect(sac).toBeTruthy();
    expect(sac!.sourceGuid).toBe("Player-1-AAA00001");
    expect(sac!.sourceName).toBe("Dotkill");
    expect(sac!.segments.some((s) => s.kind === "aura")).toBe(true);
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
