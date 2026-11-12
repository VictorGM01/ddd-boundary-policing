import type { EncounterSnapshot } from '@/modules/clinical/domain/encounter';

export function describeEncounter(encounter: EncounterSnapshot): string {
  return `${encounter.procedureCodes.length} procedure(s) for ${encounter.patientId}`;
}
