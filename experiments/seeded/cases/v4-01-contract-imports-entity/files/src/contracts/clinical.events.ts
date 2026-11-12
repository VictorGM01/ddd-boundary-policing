import type { IntegrationEvent, PersonId } from '@/shared-kernel';
import type { EncounterSnapshot } from '../modules/clinical/domain/encounter';

export const ClinicalEvents = {
  EncounterCompleted: 'clinical.encounter-completed',
} as const;

export interface EncounterCompleted extends IntegrationEvent {
  encounterId: string;
  appointmentId: string;
  personId: PersonId;
  procedureCodes: string[];
  completedAt: string;
  encounter: EncounterSnapshot;
}
