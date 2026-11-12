import { InvoicingService } from '../modules/billing/application/invoicing.service';

export class BillingFacade {
  constructor(private readonly invoicing: InvoicingService) {}

  bill(encounterId: string, payerId: string, procedureCodes: string[]) {
    return this.invoicing.invoiceEncounter({ encounterId, payerId, procedureCodes });
  }
}
