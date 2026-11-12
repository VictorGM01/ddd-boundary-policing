import type { IntegrationEvent, PersonId } from '@/shared-kernel';

export const ClinicalEvents = {
  EncounterCompleted: 'clinical.encounter-completed',
} as const;

export interface EncounterCompleted extends IntegrationEvent {
  encounterId: string;
  appointmentId: string;
  personId: PersonId;
  procedureCodes: string[];
  completedAt: string;
}

export class EncounterCompletedEvent {
  constructor(readonly payload: EncounterCompleted) {}

  isBillable(): boolean {
    return this.payload.procedureCodes.length > 0;
  }

  consultationIncluded(): boolean {
    return this.payload.procedureCodes.includes('10101012');
  }
}
