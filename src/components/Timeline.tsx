import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { Match, TimelineRow, TimelineSegment } from "../types";
import {
  formatOffset,
  formatRulerTime,
  schoolColor,
  schoolLabelColor,
} from "../lib/schoolColor";
import { prefetchIcons } from "../lib/spellIcons";
import { SpellIcon } from "./SpellIcon";

const LABEL_W = 200;
/** Must match --seg-h / --seg-icon in styles.css */
const SEG = 16;

interface Props {
  match: Match;
  rows: TimelineRow[];
  pxPerSecond: number;
}

interface Tip {
  x: number;
  y: number;
  spellName: string;
  source: string;
  target: string | null;
  at: string;
  kind: string;
  spellId: number | null;
}

export function Timeline({ match, rows, pxPerSecond }: Props) {
  const durationSec = Math.max(match.durationMs / 1000, 1);
  const trackW = Math.max(durationSec * pxPerSecond, 480);
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    prefetchIcons(rows.map((r) => r.spellId));
  }, [rows]);

  const ticks = useMemo(() => {
    const majorEvery = pxPerSecond >= 48 ? 1 : pxPerSecond >= 24 ? 2 : 5;
    const minorEvery = majorEvery === 1 ? 0.1 : majorEvery === 2 ? 0.5 : 1;
    const out: { t: number; major: boolean }[] = [];
    const n = Math.ceil(durationSec / minorEvery);
    for (let i = 0; i <= n; i++) {
      const t = Math.round(i * minorEvery * 1000) / 1000;
      if (t > durationSec + 0.001) break;
      const major = Math.abs(t / majorEvery - Math.round(t / majorEvery)) < 0.001;
      out.push({ t, major });
    }
    return out;
  }, [durationSec, pxPerSecond]);

  const onSeg = (e: MouseEvent, row: TimelineRow, seg: TimelineSegment) => {
    setTip({
      x: e.clientX + 12,
      y: e.clientY + 12,
      spellName: row.spellName,
      source: seg.sourceName,
      target: seg.targetName,
      at: formatOffset(seg.startMs),
      kind: seg.kind,
      spellId: row.spellId,
    });
  };

  return (
    <div className="timeline-wrap">
      <div className="timeline" style={{ width: LABEL_W + trackW }}>
        <div className="ruler">
          <div className="ruler-label" />
          <div className="ruler-track" style={{ width: trackW }}>
            <div className="ruler-axis" />
            {ticks.map(({ t, major }) => (
              <div
                key={t}
                className={`tick${major ? " major" : " minor"}`}
                style={{ left: t * pxPerSecond }}
              >
                {major ? <span className="tick-label">{formatRulerTime(t)}</span> : null}
              </div>
            ))}
          </div>
        </div>

        {rows.map((row) => {
          const bar = schoolColor(row.school);
          const label = schoolLabelColor(row.school);
          return (
            <div className="row" key={row.key}>
              <div className="row-label" title={`${row.sourceName} — ${row.spellName}`}>
                <SpellIcon spellId={row.spellId} spellName={row.spellName} size={SEG} />
                <span className="spell-name" style={{ color: label }}>
                  {row.spellName}
                </span>
              </div>
              <div className="row-track" style={{ width: trackW }}>
                {row.segments.map((seg, i) => {
                  const left = (seg.startMs / 1000) * pxPerSecond;
                  if (seg.kind === "cast") {
                    return (
                      <div
                        key={`${seg.eventId}-${i}`}
                        className="seg cast"
                        style={{ left, width: SEG, height: SEG }}
                        onMouseEnter={(e) => onSeg(e, row, seg)}
                        onMouseMove={(e) => onSeg(e, row, seg)}
                        onMouseLeave={() => setTip(null)}
                      >
                        <SpellIcon spellId={row.spellId} spellName={row.spellName} size={SEG} />
                      </div>
                    );
                  }
                  const durMs = Math.max((seg.endMs ?? seg.startMs) - seg.startMs, 0);
                  // Bar is at least one icon wide; icon covers the left SEG px exactly.
                  const width = Math.max((durMs / 1000) * pxPerSecond, SEG);
                  return (
                    <div
                      key={`${seg.eventId}-${i}`}
                      className="seg aura"
                      style={{
                        left,
                        width,
                        height: SEG,
                        background: bar,
                      }}
                      onMouseEnter={(e) => onSeg(e, row, seg)}
                      onMouseMove={(e) => onSeg(e, row, seg)}
                      onMouseLeave={() => setTip(null)}
                    >
                      {/* Black mask + icon: same SEG×SEG as the bar height, flush left. */}
                      <span className="aura-icon" style={{ width: SEG, height: SEG }}>
                        <SpellIcon spellId={row.spellId} spellName={row.spellName} size={SEG} />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="t-title">
            <SpellIcon spellId={tip.spellId} spellName={tip.spellName} size={24} />
            <span>{tip.spellName}</span>
          </div>
          <div className="t-meta">
            {tip.at} · {tip.kind}
            <br />
            {tip.source}
            {tip.target ? ` → ${tip.target}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
