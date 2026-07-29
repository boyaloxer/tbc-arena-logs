/** COMBATLOG_OBJECT bitfields (Classic / TBC). */
export const AFFILIATION_MINE = 0x00000001;
export const AFFILIATION_PARTY = 0x00000002;
export const AFFILIATION_RAID = 0x00000004;
export const AFFILIATION_OUTSIDER = 0x00000008;
export const REACTION_FRIENDLY = 0x00000010;
export const REACTION_NEUTRAL = 0x00000020;
export const REACTION_HOSTILE = 0x00000040;
export const CONTROL_PLAYER = 0x00000100;
export const TYPE_PLAYER = 0x00000400;
export const TYPE_NPC = 0x00000800;
export const TYPE_PET = 0x00001000;
export const TYPE_GUARDIAN = 0x00002000;

export function parseFlags(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number.parseInt(raw, 16);
  return Number.isFinite(n) ? n : 0;
}

export function isPlayerGuid(guid: string | null | undefined): boolean {
  return !!guid && guid.startsWith("Player-");
}

export function isPetGuid(guid: string | null | undefined): boolean {
  if (!guid) return false;
  return (
    guid.startsWith("Pet-") ||
    guid.startsWith("Creature-") || // some pets log as Creature in classic
    false
  );
}

export function isFriendlyFlags(flags: number): boolean {
  return (flags & (AFFILIATION_MINE | AFFILIATION_PARTY | AFFILIATION_RAID | REACTION_FRIENDLY)) !== 0
    && (flags & REACTION_HOSTILE) === 0;
}

export function isHostileFlags(flags: number): boolean {
  return (flags & REACTION_HOSTILE) !== 0 || (flags & AFFILIATION_OUTSIDER) !== 0;
}

export function isTypePlayer(flags: number): boolean {
  return (flags & TYPE_PLAYER) !== 0;
}

export function isTypePet(flags: number): boolean {
  return (flags & (TYPE_PET | TYPE_GUARDIAN)) !== 0;
}
