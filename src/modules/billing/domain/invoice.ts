import type { PersonId } from '@/shared-kernel';
import { EmptyInvoiceError, InvalidLineAmountError } from './invoice.errors';

export type InvoiceSourceType = 'ENCOUNTER' | 'NO_SHOW';
export type InvoiceStatus = 'OPEN';

export interface InvoiceSource {
  type: InvoiceSourceType;
  id: string;
}

export interface InvoiceLine {
  code: string;
  description: string;
  amountCents: number;
}

export interface InvoiceSnapshot {
  id: string;
  payerId: PersonId;
  source: InvoiceSource;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  issuedAt: Date;
}

export interface IssueInvoiceInput {
  id: string;
  payerId: PersonId;
  source: InvoiceSource;
  lines: InvoiceLine[];
  issuedAt: Date;
}

export class Invoice {
  private constructor(private readonly props: InvoiceSnapshot) {}

  static issue(input: IssueInvoiceInput): Invoice {
    if (input.lines.length === 0) {
      throw new EmptyInvoiceError();
    }
    for (const line of input.lines) {
      if (!Number.isInteger(line.amountCents) || line.amountCents <= 0) {
        throw new InvalidLineAmountError(line.code);
      }
    }
    return new Invoice({ ...input, lines: input.lines.map((l) => ({ ...l })), status: 'OPEN' });
  }

  static restore(snapshot: InvoiceSnapshot): Invoice {
    return new Invoice({ ...snapshot });
  }

  get id(): string {
    return this.props.id;
  }

  get totalCents(): number {
    return this.props.lines.reduce((sum, line) => sum + line.amountCents, 0);
  }

  toSnapshot(): InvoiceSnapshot {
    return { ...this.props, source: { ...this.props.source }, lines: this.props.lines.map((l) => ({ ...l })) };
  }
}
