/** Rough class inference from iconic TBC spells (spellId → class). */
const SPELL_CLASS: Record<number, string> = {
  // Warlock
  172: "Warlock",
  980: "Warlock",
  18265: "Warlock",
  27243: "Warlock",
  30108: "Warlock",
  17877: "Warlock",
  18288: "Warlock",
  18708: "Warlock",
  27223: "Warlock",
  6215: "Warlock",
  17928: "Warlock",
  11719: "Warlock",
  603: "Warlock",
  // Rogue
  2098: "Rogue",
  6770: "Rogue",
  408: "Rogue",
  2094: "Rogue",
  1776: "Rogue",
  1833: "Rogue",
  703: "Rogue",
  1943: "Rogue",
  8647: "Rogue",
  16511: "Rogue",
  48668: "Rogue",
  // Mage
  118: "Mage",
  12826: "Mage",
  2139: "Mage",
  12051: "Mage",
  11958: "Mage",
  45438: "Mage",
  27082: "Mage",
  30451: "Mage",
  // Priest
  605: "Priest",
  10912: "Priest",
  10890: "Priest",
  32375: "Priest",
  33206: "Priest",
  10060: "Priest",
  25218: "Priest",
  25314: "Priest",
  // Warrior
  25264: "Warrior",
  25236: "Warrior",
  12328: "Warrior",
  12292: "Warrior",
  871: "Warrior",
  23920: "Warrior",
  // Paladin
  10308: "Paladin",
  10278: "Paladin",
  1044: "Paladin",
  19752: "Paladin",
  27173: "Paladin",
  31884: "Paladin",
  // Druid
  33786: "Druid",
  26989: "Druid",
  29166: "Druid",
  26992: "Druid",
  33891: "Druid",
  // Shaman
  25442: "Shaman",
  25449: "Shaman",
  16166: "Shaman",
  30823: "Shaman",
  16188: "Shaman",
  // Hunter
  14311: "Hunter",
  19503: "Hunter",
  34490: "Hunter",
  19574: "Hunter",
  27065: "Hunter",
};

export function classFromSpell(spellId: number | null): string | null {
  if (!spellId) return null;
  return SPELL_CLASS[spellId] ?? null;
}

export const ARENA_MAPS: Record<number, string> = {
  559: "Nagrand Arena",
  562: "Blade's Edge Arena",
  572: "Ruins of Lordaeron",
  617: "Dalaran Sewers",
  618: "Ring of Valor",
};

export function isArenaMapId(mapId: number | null | undefined): boolean {
  return mapId != null && mapId in ARENA_MAPS;
}

export function arenaName(mapId: number | null | undefined, zoneName?: string | null): string {
  if (mapId != null && ARENA_MAPS[mapId]) return ARENA_MAPS[mapId];
  if (zoneName && /arena|ruins of lordaeron|nagrand|blade'?s edge|ring of valor|dalaran sewers/i.test(zoneName)) {
    return zoneName;
  }
  return zoneName || "Arena";
}
