import { DomainError } from '@/shared-kernel';

export class InvalidEncounterTransitionError extends DomainError {
  constructor(action: string, status: string) {
    super(`Cannot ${action} an encounter that is ${status}`);
  }
}

export class ProcedureRequiredError extends DomainError {
  constructor() {
    super('An encounter can only be completed with at least one procedure code');
  }
}
