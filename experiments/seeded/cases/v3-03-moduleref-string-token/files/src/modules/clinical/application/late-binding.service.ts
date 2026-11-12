import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

interface Invoicer {
  invoiceEncounter(input: { encounterId: string; payerId: string; procedureCodes: string[] }): Promise<unknown>;
}

@Injectable()
export class LateBindingService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async bill(encounterId: string, payerId: string, procedureCodes: string[]): Promise<void> {
    const invoicer = this.moduleRef.get<Invoicer>('InvoicingService', { strict: false });
    await invoicer.invoiceEncounter({ encounterId, payerId, procedureCodes });
  }
}
