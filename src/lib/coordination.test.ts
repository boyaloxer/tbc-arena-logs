import { describe, expect, it } from "vitest";
import fixture from "../fixtures/sample-arena.log?raw";
import { parseArenaLog } from "./parseLog";
import { buildCoordinationChart, defaultCoordinationTarget } from "./coordination";

describe("coordination chart", () => {
  it("stacks damage by source onto the busiest enemy", () => {
    const { matches } = parseArenaLog(fixture);
    expect(matches.length).toBe(1);
    const match = matches[0];
    const target = defaultCoordinationTarget(match);
    expect(target).toBeTruthy();
    const chart = buildCoordinationChart(match, target!);
    expect(chart).not.toBeNull();
    expect(chart!.series.length).toBeGreaterThan(0);
    expect(chart!.maxStackDps).toBeGreaterThan(0);
    const total = chart!.series.reduce((a, s) => a + s.total, 0);
    expect(total).toBeGreaterThan(0);
  });
});
