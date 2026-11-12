import type { IntegrationEvent, PersonId, PractitionerId } from '@/shared-kernel';

export const ClinicalEvents = {
  EncounterCompleted: 'clinical.encounter-completed',
} as const;

export interface EncounterCompleted extends IntegrationEvent {
  encounterId: string;
  appointmentId: string;
  personId: PersonId;
  practitionerId: PractitionerId;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  notes: string | null;
  diagnosisCodes: string[];
  procedureCodes: string[];
  arrivedAt: string;
  startedAt: string | null;
  completedAt: string;
}
