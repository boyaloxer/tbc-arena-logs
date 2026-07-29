import { useMemo } from "react";
import type { TimelineRow } from "../types";
import { SpellIcon } from "./SpellIcon";

interface Props {
  rows: TimelineRow[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
}

/** WCL-style source/target aura icon strips above the timeline. */
export function AuraFilters({ rows, hidden, onToggle }: Props) {
  const { sourceKeys, targetish } = useMemo(() => {
    const sourceKeys: TimelineRow[] = [];
    const targetish: TimelineRow[] = [];
    const seenSrc = new Set<string>();
    const seenTgt = new Set<string>();
    for (const row of rows) {
      const hasAura = row.segments.some((s) => s.kind === "aura");
      if (!hasAura) continue;
      const sk = `${row.spellId}|${row.spellName}`;
      if (!seenSrc.has(sk)) {
        seenSrc.add(sk);
        sourceKeys.push(row);
      }
      // Rows that apply to someone else show in "target" strip too
      const appliesToOther = row.segments.some(
        (s) => s.kind === "aura" && s.targetGuid && s.targetGuid !== s.sourceGuid,
      );
      if (appliesToOther && !seenTgt.has(sk)) {
        seenTgt.add(sk);
        targetish.push(row);
      }
    }
    return { sourceKeys, targetish };
  }, [rows]);

  if (!sourceKeys.length && !targetish.length) return null;

  return (
    <div className="aura-filters">
      <FilterStrip
        label="Source Auras Filter:"
        rows={sourceKeys}
        hidden={hidden}
        onToggle={onToggle}
      />
      <FilterStrip
        label="Target Auras Filter:"
        rows={targetish}
        hidden={hidden}
        onToggle={onToggle}
      />
    </div>
  );
}

function FilterStrip({
  label,
  rows,
  hidden,
  onToggle,
}: {
  label: string;
  rows: TimelineRow[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (!rows.length) return null;
  return (
    <div className="aura-filter-row">
      <span className="aura-filter-label">{label}</span>
      <div className="aura-filter-icons">
        {rows.map((row) => {
          const off = hidden.has(row.key);
          return (
            <button
              key={row.key}
              type="button"
              className={`aura-filter-btn${off ? " off" : ""}`}
              title={row.spellName}
              onClick={() => onToggle(row.key)}
            >
              <SpellIcon spellId={row.spellId} spellName={row.spellName} size={22} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
