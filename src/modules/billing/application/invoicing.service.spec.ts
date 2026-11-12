import { FixedClock } from '@/shared-kernel';
import { Invoice, InvoiceSource } from '../domain/invoice';
import { SourceAlreadyInvoicedError } from '../domain/invoice.errors';
import { InvoiceRepository } from '../domain/invoice.repository';
import { PriceList } from '../domain/price-list';
import { InvoicingService } from './invoicing.service';

class InMemoryInvoiceRepository extends InvoiceRepository {
  readonly items: Invoice[] = [];

  async existsForSource(source: InvoiceSource) {
    return (await this.findBySource(source)) !== null;
  }

  async findByPayer(payerId: string) {
    return this.items.filter((i) => i.toSnapshot().payerId === payerId);
  }

  async findBySource(source: InvoiceSource) {
    return (
      this.items.find((i) => {
        const s = i.toSnapshot().source;
        return s.type === source.type && s.id === source.id;
      }) ?? null
    );
  }

  async save(invoice: Invoice) {
    this.items.push(invoice);
  }
}

describe('InvoicingService', () => {
  let repository: InMemoryInvoiceRepository;
  let service: InvoicingService;

  beforeEach(() => {
    repository = new InMemoryInvoiceRepository();
    service = new InvoicingService(repository, new PriceList(), new FixedClock(new Date('2026-03-02T11:00:00Z')));
  });

  it('prices the procedure codes of an encounter into a persisted invoice', async () => {
    await service.invoiceEncounter({ encounterId: 'e-1', payerId: 'person-1', procedureCodes: ['10101012'] });

    expect(repository.items).toHaveLength(1);
    expect(repository.items[0].toSnapshot()).toMatchObject({
      payerId: 'person-1',
      source: { type: 'ENCOUNTER', id: 'e-1' },
      lines: [{ code: '10101012', amountCents: 25_000 }],
    });
  });

  it('never invoices the same encounter twice', async () => {
    const input = { encounterId: 'e-1', payerId: 'person-1', procedureCodes: ['10101012'] };
    await service.invoiceEncounter(input);

    await expect(service.invoiceEncounter(input)).rejects.toThrow(SourceAlreadyInvoicedError);
    expect(repository.items).toHaveLength(1);
  });

  it('charges the no-show fee once per appointment', async () => {
    await service.chargeNoShow({ appointmentId: 'appt-1', payerId: 'person-1' });

    await expect(service.chargeNoShow({ appointmentId: 'appt-1', payerId: 'person-1' })).rejects.toThrow(
      SourceAlreadyInvoicedError,
    );
    expect(repository.items[0].totalCents).toBe(10_000);
  });
});
