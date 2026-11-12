import { Inject, Injectable } from '@nestjs/common';

interface Invoicer {
  invoiceEncounter(input: { encounterId: string; payerId: string; procedureCodes: string[] }): Promise<unknown>;
}

@Injectable()
export class BridgedBillingService {
  constructor(@Inject('INVOICING') private readonly invoicer: Invoicer) {}

  bill(encounterId: string, payerId: string, procedureCodes: string[]) {
    return this.invoicer.invoiceEncounter({ encounterId, payerId, procedureCodes });
  }
}
