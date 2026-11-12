import { Module } from '@nestjs/common';
import { ClinicalEventsListener } from './api/clinical-events.listener';
import { InvoicesController } from './api/invoices.controller';
import { SchedulingEventsListener } from './api/scheduling-events.listener';
import { InvoicingService } from './application/invoicing.service';
import { InvoiceRepository } from './domain/invoice.repository';
import { PriceList } from './domain/price-list';
import { PrismaInvoiceRepository } from './infrastructure/prisma-invoice.repository';

@Module({
  controllers: [InvoicesController],
  providers: [
    InvoicingService,
    ClinicalEventsListener,
    SchedulingEventsListener,
    { provide: PriceList, useValue: new PriceList() },
    { provide: InvoiceRepository, useClass: PrismaInvoiceRepository },
  ],
  exports: [InvoicingService],
})
export class BillingModule {}
