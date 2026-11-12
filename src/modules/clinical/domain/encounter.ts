import type { PersonId, PractitionerId } from '@/shared-kernel';
import { InvalidEncounterTransitionError, ProcedureRequiredError } from './encounter.errors';

export type EncounterStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';

export interface EncounterSnapshot {
  id: string;
  appointmentId: string;
  patientId: PersonId;
  practitionerId: PractitionerId;
  status: EncounterStatus;
  notes: string | null;
  diagnosisCodes: string[];
  procedureCodes: string[];
  arrivedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface PatientArrival {
  id: string;
  appointmentId: string;
  patientId: PersonId;
  practitionerId: PractitionerId;
  arrivedAt: Date;
}

export interface EncounterRecord {
  notes: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
}

export class Encounter {
  private constructor(private props: EncounterSnapshot) {}

  static open(arrival: PatientArrival): Encounter {
    return new Encounter({
      ...arrival,
      status: 'WAITING',
      notes: null,
      diagnosisCodes: [],
      procedureCodes: [],
      startedAt: null,
      completedAt: null,
    });
  }

  static restore(snapshot: EncounterSnapshot): Encounter {
    return new Encounter({ ...snapshot });
  }

  get id(): string {
    return this.props.id;
  }

  get status(): EncounterStatus {
    return this.props.status;
  }

  start(now: Date): void {
    if (this.props.status !== 'WAITING') {
      throw new InvalidEncounterTransitionError('start', this.props.status);
    }
    this.props.status = 'IN_PROGRESS';
    this.props.startedAt = now;
  }

  complete(record: EncounterRecord, now: Date): void {
    if (this.props.status !== 'IN_PROGRESS') {
      throw new InvalidEncounterTransitionError('complete', this.props.status);
    }
    const procedureCodes = normalizeCodes(record.procedureCodes);
    if (procedureCodes.length === 0) {
      throw new ProcedureRequiredError();
    }
    this.props.status = 'COMPLETED';
    this.props.notes = record.notes;
    this.props.diagnosisCodes = normalizeCodes(record.diagnosisCodes);
    this.props.procedureCodes = procedureCodes;
    this.props.completedAt = now;
  }

  toSnapshot(): EncounterSnapshot {
    return {
      ...this.props,
      diagnosisCodes: [...this.props.diagnosisCodes],
      procedureCodes: [...this.props.procedureCodes],
    };
  }
}

function normalizeCodes(codes: readonly string[]): string[] {
  return [...new Set(codes.map((code) => code.trim()).filter((code) => code.length > 0))];
}
