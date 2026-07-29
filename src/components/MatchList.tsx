import type { Match } from "../types";
import { formatDuration } from "../lib/schoolColor";

interface Props {
  matches: Match[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MatchList({ matches, selectedId, onSelect }: Props) {
  if (!matches.length) {
    return <div className="muted">No matches yet.</div>;
  }

  return (
    <div className="match-list">
      {matches.map((m) => {
        const enemies = m.players.filter((p) => p.side === "enemy");
        const friendlies = m.players.filter((p) => p.side === "friendly");
        const comp = (list: typeof enemies) =>
          list.map((p) => p.className || p.name).join(" / ") || "—";
        return (
          <button
            key={m.id}
            type="button"
            className={`match-card${selectedId === m.id ? " active" : ""}`}
            onClick={() => onSelect(m.id)}
          >
            <div className="title">
              Match {m.index} — {m.map}
            </div>
            <div className="meta">
              {m.startedAt} · {formatDuration(m.durationMs)} · {m.result}
              <br />
              Us: {comp(friendlies)}
              <br />
              Them: {comp(enemies)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
