import { Injectable, OnModuleInit } from '@nestjs/common';
import { InvoicingService } from './invoicing.service';

@Injectable()
export class InvoicingBootstrap implements OnModuleInit {
  constructor(private readonly invoicing: InvoicingService) {}

  onModuleInit(): void {
    (globalThis as Record<string, unknown>).__clinicInvoicing = this.invoicing;
  }
}
