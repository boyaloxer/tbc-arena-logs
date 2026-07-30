import { useMemo, useState } from "react";
import type { Match } from "../types";
import { buildCoordinationChart, defaultCoordinationTarget } from "../lib/coordination";
import { formatRulerTime } from "../lib/schoolColor";

interface Props {
  match: Match;
  /** Selected target GUID, or "any" to auto-pick busiest enemy. */
  targetFilter: string;
  sourceFilter: string;
}

const W = 920;
const H = 340;
const PAD = { top: 28, right: 16, bottom: 36, left: 52 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function formatDps(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(Math.round(n));
}

/** Build stacked area paths (bottom→top order = series reversed for paint). */
function stackedPaths(
  series: { buckets: number[]; color: string; name: string }[],
  bucketStartsMs: number[],
  maxStack: number,
  durationMs: number,
): { d: string; color: string; name: string }[] {
  const n = bucketStartsMs.length;
  if (!n || !series.length) return [];

  // cumulative[s][i] = sum of series[0..s] at bucket i
  const cum: number[][] = [];
  for (let s = 0; s < series.length; s++) {
    const row: number[] = [];
    for (let i = 0; i < n; i++) {
      const prev = s === 0 ? 0 : cum[s - 1][i];
      row.push(prev + (series[s].buckets[i] ?? 0));
    }
    cum.push(row);
  }

  const xAt = (i: number) => {
    const t = bucketStartsMs[i] ?? 0;
    return PAD.left + (t / Math.max(durationMs, 1)) * INNER_W;
  };
  const yAt = (v: number) => PAD.top + INNER_H - (v / maxStack) * INNER_H;

  const out: { d: string; color: string; name: string }[] = [];
  for (let s = 0; s < series.length; s++) {
    const top = cum[s];
    const bot = s === 0 ? null : cum[s - 1];
    let d = `M ${xAt(0)} ${yAt(top[0])}`;
    for (let i = 1; i < n; i++) d += ` L ${xAt(i)} ${yAt(top[i])}`;
    if (bot) {
      for (let i = n - 1; i >= 0; i--) d += ` L ${xAt(i)} ${yAt(bot[i])}`;
    } else {
      for (let i = n - 1; i >= 0; i--) d += ` L ${xAt(i)} ${yAt(0)}`;
    }
    d += " Z";
    out.push({ d, color: series[s].color, name: series[s].name });
  }
  return out;
}

export function CoordinationGraph({ match, targetFilter, sourceFilter }: Props) {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    t: string;
    total: number;
    parts: { name: string; dps: number; color: string }[];
  } | null>(null);

  const targetGuid = useMemo(() => {
    if (targetFilter !== "any") return targetFilter;
    return defaultCoordinationTarget(match);
  }, [match, targetFilter]);

  const chart = useMemo(() => {
    if (!targetGuid) return null;
    return buildCoordinationChart(match, targetGuid, {
      bucketMs: 1000,
      sourceGuid: sourceFilter === "all" ? "all" : sourceFilter,
    });
  }, [match, targetGuid, sourceFilter]);

  const paths = useMemo(() => {
    if (!chart) return [];
    // Paint low-total series first so big contributors sit on top visually in stack order
    // (we sorted high→low; reverse for bottom of stack = largest base layer optional)
    // WCL usually puts biggest on bottom or top; use low→high so largest is on top of stack.
    const ordered = [...chart.series].reverse();
    return stackedPaths(ordered, chart.bucketStartsMs, chart.maxStackDps, match.durationMs);
  }, [chart, match.durationMs]);

  if (!targetGuid) {
    return (
      <div className="coord-empty">
        No players found to chart. Load a match with damage events.
      </div>
    );
  }

  if (!chart) {
    return (
      <div className="coord-empty">
        No damage onto <strong>{match.players.find((p) => p.guid === targetGuid)?.name ?? "target"}</strong>{" "}
        with the current filters. Pick a target who took hits, or set Target to{" "}
        <em>Any target</em> (auto-picks the busiest enemy).
      </div>
    );
  }

  const yTicks = 4;
  const xTickEvery = Math.max(1, Math.ceil(match.durationMs / 1000 / 8));

  const onMove = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    const rel = x - PAD.left;
    if (rel < 0 || rel > INNER_W) {
      setHover(null);
      return;
    }
    const tMs = (rel / INNER_W) * match.durationMs;
    const idx = Math.min(
      chart.bucketStartsMs.length - 1,
      Math.max(0, Math.floor(tMs / chart.bucketMs)),
    );
    const parts = chart.series
      .map((s) => ({
        name: s.name,
        dps: s.buckets[idx] ?? 0,
        color: s.color,
      }))
      .filter((p) => p.dps > 0);
    const total = parts.reduce((a, b) => a + b.dps, 0);
    setHover({
      x: clientX + 12,
      y: clientY + 12,
      t: formatRulerTime(chart.bucketStartsMs[idx] / 1000),
      total,
      parts,
    });
  };

  return (
    <div className="coord-wrap">
      <div className="coord-header">
        <div>
          <h3>Coordination — damage on {chart.targetName}</h3>
          <p className="muted">
            Stacked DPS by source (1s buckets). Peaks = everyone hitting the same target together.
            {targetFilter === "any" ? " Target auto-selected (most damaged enemy)." : ""}
          </p>
        </div>
        <div className="coord-legend">
          {chart.series.map((s) => (
            <span key={s.guid} className="coord-legend-item">
              <i style={{ background: s.color }} />
              {s.name}
              <em>{Math.round(s.total).toLocaleString()} dmg</em>
            </span>
          ))}
        </div>
      </div>

      <svg
        className="coord-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={(e) => onMove(e.clientX, e.clientY, e.currentTarget)}
        onMouseLeave={() => setHover(null)}
      >
        <rect x={0} y={0} width={W} height={H} fill="#000" />
        {/* grid */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = (chart.maxStackDps * i) / yTicks;
          const y = PAD.top + INNER_H - (i / yTicks) * INNER_H;
          return (
            <g key={`y${i}`}>
              <line
                x1={PAD.left}
                x2={PAD.left + INNER_W}
                y1={y}
                y2={y}
                stroke="#222"
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={y + 4} fill="#888" fontSize={11} textAnchor="end">
                {formatDps(v)}
              </text>
            </g>
          );
        })}
        {chart.bucketStartsMs.map((t, i) => {
          const sec = t / 1000;
          if (sec % xTickEvery !== 0 && i !== 0) return null;
          const x = PAD.left + (t / Math.max(match.durationMs, 1)) * INNER_W;
          return (
            <g key={`x${i}`}>
              <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + INNER_H} stroke="#1a1a1a" />
              <text x={x} y={H - 12} fill="#aaa" fontSize={11} textAnchor="middle">
                {formatRulerTime(sec)}
              </text>
            </g>
          );
        })}

        {paths.map((p) => (
          <path key={p.name} d={p.d} fill={p.color} fillOpacity={0.85} stroke="none" />
        ))}

        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + INNER_H}
          stroke="#666"
        />
        <line
          x1={PAD.left}
          x2={PAD.left + INNER_W}
          y1={PAD.top + INNER_H}
          y2={PAD.top + INNER_H}
          stroke="#666"
        />
        <text x={14} y={PAD.top + INNER_H / 2} fill="#888" fontSize={11} transform={`rotate(-90 14 ${PAD.top + INNER_H / 2})`}>
          DPS
        </text>
      </svg>

      {hover && (
        <div className="tooltip" style={{ left: hover.x, top: hover.y }}>
          <div className="t-title">{hover.t} — {formatDps(hover.total)} DPS stacked</div>
          <div className="t-meta">
            {hover.parts.map((p) => (
              <div key={p.name}>
                <span style={{ color: p.color }}>■</span> {p.name}: {formatDps(p.dps)}
              </div>
            ))}
            {!hover.parts.length && <div>No damage this second</div>}
          </div>
        </div>
      )}
    </div>
  );
}
