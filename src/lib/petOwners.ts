import type { CombatEvent } from "../types";
import { isPetGuid, isPlayerGuid } from "./flags";

export interface PetOwner {
  ownerGuid: string;
  ownerName: string;
}

/** Pet GUID → summoning player, from SPELL_SUMMON / similar. */
export function buildPetOwnerMap(events: CombatEvent[]): Map<string, PetOwner> {
  const map = new Map<string, PetOwner>();
  for (const ev of events) {
    if (ev.kind !== "summon" && ev.subEvent !== "SPELL_SUMMON") continue;
    const owner = ev.source;
    const pet = ev.target;
    if (!owner || !pet) continue;
    if (!isPlayerGuid(owner.guid)) continue;
    if (!isPetGuid(pet.guid) && !pet.guid.startsWith("Pet-")) continue;
    map.set(pet.guid, { ownerGuid: owner.guid, ownerName: owner.name });
  }
  return map;
}

/** Prefer the owning player for pet-sourced CLEU (e.g. Voidwalker Sacrifice). */
export function resolveActorOwner(
  guid: string,
  name: string,
  petOwners: Map<string, PetOwner>,
): { guid: string; name: string; petName: string | null } {
  const owner = petOwners.get(guid);
  if (!owner) return { guid, name, petName: null };
  return { guid: owner.ownerGuid, name: owner.ownerName, petName: name };
}
