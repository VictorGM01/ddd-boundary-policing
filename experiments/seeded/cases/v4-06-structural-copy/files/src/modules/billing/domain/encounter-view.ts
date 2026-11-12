export type EncounterStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';

export interface EncounterView {
  id: string;
  appointmentId: string;
  patientId: string;
  practitionerId: string;
  status: EncounterStatus;
  notes: string | null;
  diagnosisCodes: string[];
  procedureCodes: string[];
}

export function isInvoiceable(encounter: EncounterView): boolean {
  return encounter.status === 'COMPLETED' && encounter.procedureCodes.length > 0;
}
