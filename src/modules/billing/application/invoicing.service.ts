import { Injectable } from '@nestjs/common';
import { Clock, newId, PersonId } from '@/shared-kernel';
import { Invoice, InvoiceLine, InvoiceSource } from '../domain/invoice';
import { SourceAlreadyInvoicedError } from '../domain/invoice.errors';
import { InvoiceRepository } from '../domain/invoice.repository';
import { PriceList } from '../domain/price-list';

@Injectable()
export class InvoicingService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly priceList: PriceList,
    private readonly clock: Clock,
  ) {}

  async invoiceEncounter(input: { encounterId: string; payerId: PersonId; procedureCodes: string[] }): Promise<Invoice> {
    return this.issue(
      input.payerId,
      { type: 'ENCOUNTER', id: input.encounterId },
      this.priceList.linesFor(input.procedureCodes),
    );
  }

  async chargeNoShow(input: { appointmentId: string; payerId: PersonId }): Promise<Invoice> {
    return this.issue(input.payerId, { type: 'NO_SHOW', id: input.appointmentId }, [this.priceList.noShowFee()]);
  }

  async invoicesOf(payerId: PersonId): Promise<Invoice[]> {
    return this.invoices.findByPayer(payerId);
  }

  async invoiceFor(source: InvoiceSource): Promise<Invoice | null> {
    return this.invoices.findBySource(source);
  }

  private async issue(payerId: PersonId, source: InvoiceSource, lines: InvoiceLine[]): Promise<Invoice> {
    if (await this.invoices.existsForSource(source)) {
      throw new SourceAlreadyInvoicedError(source.type, source.id);
    }
    const invoice = Invoice.issue({ id: newId(), payerId, source, lines, issuedAt: this.clock.now() });
    await this.invoices.save(invoice);
    return invoice;
  }
}
