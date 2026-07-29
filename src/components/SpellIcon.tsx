import { useEffect, useState } from "react";
import { iconUrl, peekIconName, resolveIconName } from "../lib/spellIcons";

interface Props {
  spellId: number | null | undefined;
  spellName?: string | null;
  size?: number;
  className?: string;
  title?: string;
}

export function SpellIcon({ spellId, spellName, size = 18, className, title }: Props) {
  const [slug, setSlug] = useState(() => peekIconName(spellId, spellName));

  useEffect(() => {
    let cancelled = false;
    setSlug(peekIconName(spellId, spellName));
    void resolveIconName(spellId).then((name) => {
      if (!cancelled) setSlug(name);
    });
    return () => {
      cancelled = true;
    };
  }, [spellId, spellName]);

  return (
    <img
      className={className ?? "spell-icon"}
      src={iconUrl(slug, size <= 20 ? "small" : "medium")}
      width={size}
      height={size}
      alt={spellName || slug}
      title={title || spellName || undefined}
      draggable={false}
      style={{ width: size, height: size }}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.includes("questionmark")) {
          img.src = iconUrl("inv_misc_questionmark", "small");
        }
      }}
    />
  );
}
