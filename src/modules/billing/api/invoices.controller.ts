import { BadRequestException, Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { InvoicingService } from '../application/invoicing.service';
import type { Invoice, InvoiceSourceType } from '../domain/invoice';

@Controller('billing/invoices')
export class InvoicesController {
  constructor(private readonly invoicing: InvoicingService) {}

  @Get()
  async list(
    @Query('payerId') payerId?: string,
    @Query('sourceType') sourceType?: InvoiceSourceType,
    @Query('sourceId') sourceId?: string,
  ) {
    if (sourceType && sourceId) {
      const invoice = await this.invoicing.invoiceFor({ type: sourceType, id: sourceId });
      if (!invoice) {
        throw new NotFoundException(`No invoice for ${sourceType} ${sourceId}`);
      }
      return [toResponse(invoice)];
    }
    if (!payerId) {
      throw new BadRequestException('payerId or sourceType+sourceId is required');
    }
    return (await this.invoicing.invoicesOf(payerId)).map(toResponse);
  }
}

function toResponse(invoice: Invoice) {
  const s = invoice.toSnapshot();
  return {
    id: s.id,
    payerId: s.payerId,
    source: s.source,
    status: s.status,
    lines: s.lines,
    totalCents: invoice.totalCents,
    issuedAt: s.issuedAt.toISOString(),
  };
}
