import { useCallback, useMemo, useState } from "react";
import type { Match, ParseResult, TimelineRow } from "./types";
import {
  downloadAllMatchLogs,
  downloadMatchJson,
  downloadMatchLog,
  parseArenaLog,
} from "./lib/parseLog";
import { formatDuration } from "./lib/schoolColor";
import { AuraFilters } from "./components/AuraFilters";
import { CoordinationGraph } from "./components/CoordinationGraph";
import { MatchList } from "./components/MatchList";
import { Timeline } from "./components/Timeline";
import sampleLog from "./fixtures/sample-arena.log?raw";

type ViewMode = "timeline" | "coordination";

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playerFilter, setPlayerFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<string>("any");
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [zoom, setZoom] = useState(52);
  const [hiddenAuras, setHiddenAuras] = useState<Set<string>>(() => new Set());
  const [dragOver, setDragOver] = useState(false);

  const loadText = useCallback((text: string, name: string) => {
    const parsed = parseArenaLog(text);
    setResult(parsed);
    setFileName(name);
    setSelectedId(parsed.matches[0]?.id ?? null);
    setPlayerFilter("all");
    setTargetFilter("any");
    setHiddenAuras(new Set());
  }, []);

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const text = await file.text();
      loadText(text, file.name);
    },
    [loadText],
  );

  const match: Match | null = useMemo(() => {
    if (!result || !selectedId) return null;
    return result.matches.find((m) => m.id === selectedId) ?? null;
  }, [result, selectedId]);

  const rosterPlayers = useMemo(
    () => (match ? match.players.filter((p) => !p.isPet) : []),
    [match],
  );

  /** Source + target filters: keep only segments aimed at the selected target. */
  const filteredRows = useMemo(() => {
    if (!match) return [];
    const rows: TimelineRow[] = [];
    for (const r of match.timeline) {
      if (hiddenAuras.has(r.key)) continue;
      if (playerFilter !== "all" && r.sourceGuid !== playerFilter) continue;

      let segments = r.segments;
      if (targetFilter !== "any") {
        segments = segments.filter((s) => s.targetGuid === targetFilter);
        if (!segments.length) continue;
      }

      if (segments === r.segments) {
        rows.push(r);
      } else {
        rows.push({ ...r, segments });
      }
    }
    return rows;
  }, [match, playerFilter, targetFilter, hiddenAuras]);

  const auraFilterRows = useMemo(() => {
    if (!match) return [];
    return match.timeline.filter((r) => {
      if (playerFilter !== "all" && r.sourceGuid !== playerFilter) return false;
      if (targetFilter === "any") return true;
      return r.segments.some((s) => s.targetGuid === targetFilter);
    });
  }, [match, playerFilter, targetFilter]);

  const toggleAura = useCallback((key: string) => {
    setHiddenAuras((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);


  return (
    <div
      className="app"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void onFile(f);
      }}
    >
      <header className="topbar">
        <div className="brand">TBC Arena Logs</div>
        <label className="file-btn">
          Open combat log
          <input
            type="file"
            accept=".txt,.log,text/plain"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="button" className="file-btn" onClick={() => loadText(sampleLog, "sample-arena.log")}>
          Load sample
        </button>
        {match && (
          <>
            <button type="button" className="file-btn" onClick={() => downloadMatchLog(match)}>
              Export this match (.txt)
            </button>
            <button type="button" className="file-btn" onClick={() => downloadMatchJson(match)}>
              Export JSON
            </button>
          </>
        )}
        {result && result.matches.length > 1 && (
          <button
            type="button"
            className="file-btn"
            onClick={() => downloadAllMatchLogs(result.matches)}
          >
            Export all matches (.txt)
          </button>
        )}
        <span className="drop-hint">
          {dragOver
            ? "Drop log file…"
            : fileName
              ? `Loaded: ${fileName}`
              : "Drop WoWCombatLog.txt here · Anniversary Logs folder"}
        </span>
      </header>

      {!result && (
        <div className="hero">
          <h1>WCL-style timelines for TBC arena</h1>
          <p>
            WoW writes one session file; this app <strong>splits each arena into its own match</strong>.
            Enable logging with <code>/clog on</code>, play, then open{" "}
            <code>_anniversary_\Logs\WoWCombatLog.txt</code>.
          </p>
          <p className="muted">Or click <strong>Load sample</strong> to see the UI with a fixture match.</p>
        </div>
      )}

      {result && (
        <div className="layout">
          <aside className="sidebar">
            <h2>Matches ({result.matches.length})</h2>
            <p className="sidebar-hint">
              Each card is one arena fight. Click to review that match only.
            </p>
            {result.infos.map((w) => (
              <div key={w} className="info">
                {w}
              </div>
            ))}
            {result.warnings.map((w) => (
              <div key={w} className="warning">
                {w}
              </div>
            ))}
            <MatchList
              matches={result.matches}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setPlayerFilter("all");
                setTargetFilter("any");
                setHiddenAuras(new Set());
              }}
            />
          </aside>

          <section className="main">
            {!match ? (
              <div className="empty">Select a match.</div>
            ) : (
              <>
                <div className="main-chrome">
                  <div className="toolbar">
                    <div className="view-toggle" role="group" aria-label="View">
                      <button
                        type="button"
                        className={viewMode === "timeline" ? "active" : ""}
                        onClick={() => setViewMode("timeline")}
                      >
                        Timeline
                      </button>
                      <button
                        type="button"
                        className={viewMode === "coordination" ? "active" : ""}
                        onClick={() => setViewMode("coordination")}
                      >
                        Coordination
                      </button>
                    </div>
                    <label>
                      Source
                      <select
                        value={playerFilter}
                        onChange={(e) => setPlayerFilter(e.target.value)}
                      >
                        <option value="all">All players</option>
                        {rosterPlayers.map((p) => (
                          <option key={p.guid} value={p.guid}>
                            {p.name}
                            {p.className ? ` (${p.className})` : ""} — {p.side}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Target
                      <select
                        value={targetFilter}
                        onChange={(e) => setTargetFilter(e.target.value)}
                      >
                        <option value="any">
                          {viewMode === "coordination" ? "Auto (busiest enemy)" : "Any target"}
                        </option>
                        {rosterPlayers.map((p) => (
                          <option key={p.guid} value={p.guid}>
                            {p.name}
                            {p.className ? ` (${p.className})` : ""} — {p.side}
                          </option>
                        ))}
                      </select>
                    </label>
                    {viewMode === "timeline" && (
                      <label>
                        Zoom
                        <input
                          type="range"
                          min={12}
                          max={80}
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                        />
                      </label>
                    )}
                    <span className="muted">
                      {match.map} · {formatDuration(match.durationMs)}
                      {viewMode === "timeline"
                        ? ` · ${filteredRows.length} ability rows`
                        : " · focus-fire DPS by source"}
                    </span>
                  </div>

                  <div className="stats-bar">
                    {match.players
                      .filter((p) => !p.isPet)
                      .map((p) => {
                        const s = match.stats.find((x) => x.guid === p.guid);
                        return (
                          <span key={p.guid}>
                            <strong>{p.name}</strong>{" "}
                            {s ? `${s.damage} dmg / ${s.healing} heal` : "—"}
                          </span>
                        );
                      })}
                    {match.deathOrder.length > 0 && (
                      <span>
                        Deaths:{" "}
                        {match.deathOrder
                          .map((d) => `${d.name} @ ${(d.atMs / 1000).toFixed(1)}s`)
                          .join(", ")}
                      </span>
                    )}
                  </div>

                  {viewMode === "timeline" && (
                    <AuraFilters
                      rows={auraFilterRows}
                      hidden={hiddenAuras}
                      onToggle={toggleAura}
                    />
                  )}
                </div>

                <div className="timeline-pane">
                  {viewMode === "timeline" ? (
                    <Timeline match={match} rows={filteredRows} pxPerSecond={zoom} />
                  ) : (
                    <CoordinationGraph
                      match={match}
                      targetFilter={targetFilter}
                      sourceFilter={playerFilter}
                    />
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
