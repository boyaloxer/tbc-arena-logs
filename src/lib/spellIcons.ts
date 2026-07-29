/** Known TBC / Classic spellId → Wowhead icon slug (seed; unknown IDs resolve at runtime). */
const SEED: Record<number, string> = {
  0: "ability_meleeattack",
  // Warlock
  172: "spell_shadow_abominationexplosion",
  980: "spell_shadow_curseofsargeras",
  603: "spell_shadow_auraofdarkness",
  702: "spell_shadow_curseofmannoroth",
  1714: "spell_shadow_curseoftounges",
  1490: "spell_shadow_chilltouch",
  18265: "spell_shadow_requiem",
  18288: "spell_shadow_unholyfrenzy",
  18708: "spell_shadow_spectralsight",
  17877: "spell_shadow_scourgebuild",
  17928: "spell_shadow_psychicscream",
  6215: "spell_shadow_possession",
  5484: "spell_shadow_possession",
  6789: "spell_shadow_deathcoil",
  27223: "spell_shadow_deathcoil",
  27216: "spell_shadow_abominationexplosion",
  27218: "spell_shadow_curseofsargeras",
  27243: "spell_shadow_seedofdestruction",
  30108: "spell_shadow_unstableaffliction_3",
  30405: "spell_shadow_unstableaffliction_3",
  30910: "spell_shadow_auraofdarkness",
  27215: "spell_fire_immolation",
  27209: "spell_shadow_shadowbolt",
  30545: "spell_fire_fireball02",
  11719: "spell_shadow_grimward",
  18647: "spell_shadow_cripple",
  // Rogue
  2098: "ability_rogue_eviscerate",
  26865: "ability_rogue_eviscerate",
  6770: "ability_sap",
  408: "ability_rogue_kidneyshot",
  2094: "spell_shadow_mindsteal",
  1776: "ability_gouge",
  1833: "ability_cheapshot",
  703: "ability_rogue_garrote",
  26884: "ability_rogue_garrote",
  1330: "ability_rogue_garrote",
  1943: "ability_rogue_rupture",
  8647: "ability_warrior_riposte",
  16511: "spell_shadow_lifedrain",
  48668: "ability_rogue_shadowstrikes",
  1784: "ability_stealth",
  5277: "spell_shadow_shadowward",
  31224: "spell_shadow_nethercloak",
  14177: "spell_shadow_chestthump",
  13877: "ability_warrior_punishingblow",
  13750: "spell_shadow_shadowworddominate",
  // Mage
  118: "spell_nature_polymorph",
  12826: "spell_nature_polymorph",
  2139: "spell_frost_iceshock",
  12051: "spell_nature_purge",
  11958: "spell_frost_frost",
  45438: "spell_frost_frost",
  27082: "spell_fire_selfdestruct",
  30451: "spell_arcane_blast",
  33933: "spell_fire_fireball02",
  27074: "spell_frost_frostblast",
  // Priest
  605: "spell_shadow_shadowworddominate",
  10912: "spell_shadow_shadowworddominate",
  10890: "spell_shadow_psychicscream",
  32375: "spell_arcane_massdispel",
  33206: "spell_holy_painsupression",
  10060: "spell_holy_powerinfusion",
  25218: "spell_holy_powerwordshield",
  25222: "spell_holy_renew",
  25235: "spell_holy_flashheal",
  25314: "spell_holy_greaterheal",
  25364: "spell_shadow_unholyfrenzy",
  10894: "spell_shadow_shadowwordpain",
  // Warrior / Pala / Druid / Sham / Hunt (common arena)
  25264: "ability_thunderbolt",
  25236: "ability_warrior_savageblow",
  12328: "ability_rogue_slicedice",
  12292: "ability_backstab",
  871: "ability_warrior_shieldwall",
  23920: "ability_warrior_shieldreflection",
  10308: "spell_holy_sealofmight",
  10278: "spell_holy_sealofprotection",
  1044: "spell_holy_sealofvalor",
  19752: "spell_nature_timestop",
  27173: "spell_holy_holynova",
  31884: "spell_holy_avenginewrath",
  33786: "spell_nature_earthquake",
  26989: "spell_nature_stranglevines",
  29166: "spell_nature_lightning",
  26992: "spell_nature_starfall",
  33891: "ability_druid_treeoflife",
  25442: "spell_nature_earthshock",
  25449: "spell_nature_lightning",
  16166: "spell_shadow_manaburn",
  30823: "ability_shaman_stormstrike",
  16188: "spell_nature_shamanrage",
  14311: "spell_frost_chainsofice",
  19503: "ability_golemstormbolt",
  34490: "ability_hunter_silencedshot",
  19574: "ability_druid_ferociousbite",
  27065: "ability_hunter_aimedshot",
};

const LS_KEY = "tbc-arena-logs:spell-icons:v1";
const memory = new Map<number, string>();
const inflight = new Map<number, Promise<string>>();

function loadDiskCache(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(obj)) {
      const id = Number(k);
      if (Number.isFinite(id) && v) memory.set(id, v);
    }
  } catch {
    /* ignore */
  }
}

function saveDiskCache(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const obj: Record<string, string> = {};
    for (const [k, v] of memory.entries()) obj[String(k)] = v;
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

loadDiskCache();

export function iconUrl(iconName: string, size: "small" | "medium" | "large" = "small"): string {
  const slug = (iconName || "inv_misc_questionmark").toLowerCase();
  return `https://wow.zamimg.com/images/wow/icons/${size}/${slug}.jpg`;
}

export function knownIcon(spellId: number | null | undefined): string | null {
  if (spellId == null) return null;
  if (SEED[spellId]) return SEED[spellId];
  return memory.get(spellId) ?? null;
}

/** Sync best-effort icon name (seed / cache). */
export function peekIconName(spellId: number | null | undefined, spellName?: string | null): string {
  if (spellId == null) {
    if (spellName && /^melee$/i.test(spellName)) return "ability_meleeattack";
    return "inv_misc_questionmark";
  }
  return knownIcon(spellId) ?? (spellId === 0 ? "ability_meleeattack" : "inv_misc_questionmark");
}

/**
 * Resolve icon slug for a spell. Uses seed → localStorage → Wowhead tooltip (via Vite proxy in dev).
 */
export async function resolveIconName(spellId: number | null | undefined): Promise<string> {
  if (spellId == null) return "inv_misc_questionmark";
  if (spellId === 0) return "ability_meleeattack";
  const known = knownIcon(spellId);
  if (known) return known;

  const existing = inflight.get(spellId);
  if (existing) return existing;

  const p = (async () => {
    const urls = [
      // Dev proxy (see vite.config.ts)
      `/wowhead-tooltip/spell/${spellId}?dataEnv=5`,
      // Direct (works if CORS allows; harmless if it fails)
      `https://nether.wowhead.com/tooltip/spell/${spellId}?dataEnv=5`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = (await res.json()) as { icon?: string };
        if (data.icon) {
          memory.set(spellId, data.icon);
          saveDiskCache();
          return data.icon;
        }
      } catch {
        /* try next */
      }
    }
    return "inv_misc_questionmark";
  })();

  inflight.set(spellId, p);
  try {
    return await p;
  } finally {
    inflight.delete(spellId);
  }
}

export function prefetchIcons(spellIds: Iterable<number | null | undefined>): void {
  for (const id of spellIds) {
    if (id == null || knownIcon(id)) continue;
    void resolveIconName(id);
  }
}
