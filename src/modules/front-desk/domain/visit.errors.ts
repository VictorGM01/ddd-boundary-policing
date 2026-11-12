import { DomainError } from '@/shared-kernel';

export class CheckInNotAllowedError extends DomainError {
  constructor(status: string) {
    super(`Cannot check in a visit that is ${status}`);
  }
}

export class VisitAlreadyCheckedInError extends DomainError {
  constructor() {
    super('The visitor has already checked in');
  }
}
