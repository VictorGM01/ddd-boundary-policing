import { DomainError } from '@/shared-kernel';

export class AppointmentInPastError extends DomainError {
  constructor() {
    super('An appointment cannot be scheduled in the past');
  }
}

export class SlotUnavailableError extends DomainError {
  constructor() {
    super('The practitioner already has an appointment in this slot');
  }
}

export class InvalidAppointmentTransitionError extends DomainError {
  constructor(action: string, status: string) {
    super(`Cannot ${action} an appointment that is ${status}`);
  }
}

export class NoShowBeforeStartError extends DomainError {
  constructor() {
    super('A no-show can only be recorded after the appointment start time');
  }
}
