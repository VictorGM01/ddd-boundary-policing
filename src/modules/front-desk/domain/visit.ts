import type { PersonId, PractitionerId } from '@/shared-kernel';
import { CheckInNotAllowedError, VisitAlreadyCheckedInError } from './visit.errors';

export type VisitStatus = 'EXPECTED' | 'CHECKED_IN' | 'CANCELLED';

export interface VisitSnapshot {
  id: string;
  appointmentId: string;
  personId: PersonId;
  practitionerId: PractitionerId;
  expectedAt: Date;
  status: VisitStatus;
  checkedInAt: Date | null;
}

export interface ExpectVisitInput {
  id: string;
  appointmentId: string;
  personId: PersonId;
  practitionerId: PractitionerId;
  expectedAt: Date;
}

export class Visit {
  private constructor(private props: VisitSnapshot) {}

  static expect(input: ExpectVisitInput): Visit {
    return new Visit({ ...input, status: 'EXPECTED', checkedInAt: null });
  }

  static restore(snapshot: VisitSnapshot): Visit {
    return new Visit({ ...snapshot });
  }

  get id(): string {
    return this.props.id;
  }

  get status(): VisitStatus {
    return this.props.status;
  }

  get checkedInAt(): Date | null {
    return this.props.checkedInAt;
  }

  checkIn(now: Date): void {
    if (this.props.status === 'CHECKED_IN') {
      throw new VisitAlreadyCheckedInError();
    }
    if (this.props.status !== 'EXPECTED') {
      throw new CheckInNotAllowedError(this.props.status);
    }
    this.props.status = 'CHECKED_IN';
    this.props.checkedInAt = now;
  }

  cancel(): void {
    if (this.props.status === 'EXPECTED') {
      this.props.status = 'CANCELLED';
    }
  }

  toSnapshot(): VisitSnapshot {
    return { ...this.props };
  }
}
