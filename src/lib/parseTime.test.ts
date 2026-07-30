import { describe, expect, it } from "vitest";
import { parseLogTimestamp } from "./parseTime";

describe("parseLogTimestamp", () => {
  it("parses fixture-style timestamps", () => {
    expect(parseLogTimestamp("7/29/2026 17:00:01.123")).toBe(
      Date.UTC(2026, 6, 29, 17, 0, 1, 123),
    );
  });

  it("parses Anniversary timestamps with timezone offset", () => {
    expect(parseLogTimestamp("7/29/2026 23:10:29.860-5")).toBe(
      Date.UTC(2026, 6, 29, 23, 10, 29, 860),
    );
    expect(parseLogTimestamp("7/29/2026 23:10:29.860-05:00")).toBe(
      Date.UTC(2026, 6, 29, 23, 10, 29, 860),
    );
  });
});
