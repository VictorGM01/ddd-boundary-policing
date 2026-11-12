import { Injectable } from '@nestjs/common';
import { InvoicingService } from '../../billing/application/invoicing.service';

@Injectable()
export class CompleteAndBillService {
  constructor(private readonly invoicing: InvoicingService) {}

  async bill(encounterId: string, payerId: string, procedureCodes: string[]): Promise<void> {
    await this.invoicing.invoiceEncounter({ encounterId, payerId, procedureCodes });
  }
}
