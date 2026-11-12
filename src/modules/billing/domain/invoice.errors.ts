import { DomainError } from '@/shared-kernel';

export class EmptyInvoiceError extends DomainError {
  constructor() {
    super('An invoice needs at least one line');
  }
}

export class InvalidLineAmountError extends DomainError {
  constructor(code: string) {
    super(`Line ${code} must have a positive amount`);
  }
}

export class UnknownProcedureError extends DomainError {
  constructor(code: string) {
    super(`No price for procedure ${code}`);
  }
}

export class SourceAlreadyInvoicedError extends DomainError {
  constructor(sourceType: string, sourceId: string) {
    super(`${sourceType} ${sourceId} has already been invoiced`);
  }
}
