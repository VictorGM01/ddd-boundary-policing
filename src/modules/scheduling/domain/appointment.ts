import type { PersonId, PractitionerId } from '@/shared-kernel';
import {
  AppointmentInPastError,
  InvalidAppointmentTransitionError,
  NoShowBeforeStartError,
  SlotUnavailableError,
} from './appointment.errors';

export type AppointmentStatus = 'SCHEDULED' | 'CANCELLED' | 'NO_SHOW';

export interface Requester {
  personId: PersonId;
  name: string;
  phone: string;
}

export interface AppointmentSnapshot {
  id: string;
  practitionerId: PractitionerId;
  requester: Requester;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  cancelReason: string | null;
}

export interface ScheduleAppointmentInput {
  id: string;
  practitionerId: PractitionerId;
  requester: Requester;
  startsAt: Date;
  durationMinutes?: number;
}

export const DEFAULT_DURATION_MINUTES = 30;

export class Appointment {
  private constructor(private props: AppointmentSnapshot) {}

  static schedule(
    input: ScheduleAppointmentInput,
    now: Date,
    practitionerAgenda: readonly Appointment[],
  ): Appointment {
    if (input.startsAt.getTime() <= now.getTime()) {
      throw new AppointmentInPastError();
    }
    const duration = input.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    const endsAt = new Date(input.startsAt.getTime() + duration * 60_000);
    const candidate = new Appointment({
      id: input.id,
      practitionerId: input.practitionerId,
      requester: input.requester,
      startsAt: input.startsAt,
      endsAt,
      status: 'SCHEDULED',
      cancelReason: null,
    });
    if (practitionerAgenda.some((other) => candidate.conflictsWith(other))) {
      throw new SlotUnavailableError();
    }
    return candidate;
  }

  static restore(snapshot: AppointmentSnapshot): Appointment {
    return new Appointment({ ...snapshot });
  }

  get id(): string {
    return this.props.id;
  }

  get status(): AppointmentStatus {
    return this.props.status;
  }

  get startsAt(): Date {
    return this.props.startsAt;
  }

  get endsAt(): Date {
    return this.props.endsAt;
  }

  get requester(): Requester {
    return this.props.requester;
  }

  get practitionerId(): PractitionerId {
    return this.props.practitionerId;
  }

  cancel(reason: string): void {
    if (this.props.status !== 'SCHEDULED') {
      throw new InvalidAppointmentTransitionError('cancel', this.props.status);
    }
    this.props.status = 'CANCELLED';
    this.props.cancelReason = reason;
  }

  markNoShow(now: Date): void {
    if (this.props.status !== 'SCHEDULED') {
      throw new InvalidAppointmentTransitionError('mark as no-show', this.props.status);
    }
    if (now.getTime() < this.props.startsAt.getTime()) {
      throw new NoShowBeforeStartError();
    }
    this.props.status = 'NO_SHOW';
  }

  conflictsWith(other: Appointment): boolean {
    return (
      other.id !== this.id &&
      other.status === 'SCHEDULED' &&
      other.practitionerId === this.practitionerId &&
      this.startsAt < other.endsAt &&
      other.startsAt < this.endsAt
    );
  }

  toSnapshot(): AppointmentSnapshot {
    return { ...this.props, requester: { ...this.props.requester } };
  }
}
