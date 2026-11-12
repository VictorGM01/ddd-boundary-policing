import type { Invoice, InvoiceSource } from './invoice';

export abstract class InvoiceRepository {
  abstract existsForSource(source: InvoiceSource): Promise<boolean>;
  abstract findByPayer(payerId: string): Promise<Invoice[]>;
  abstract findBySource(source: InvoiceSource): Promise<Invoice | null>;
  abstract save(invoice: Invoice): Promise<void>;
}
