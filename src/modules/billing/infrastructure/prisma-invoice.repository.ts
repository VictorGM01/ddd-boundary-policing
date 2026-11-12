import { Injectable } from '@nestjs/common';
import type { BillingInvoice, BillingInvoiceLine } from '@prisma/client';
import { newId } from '@/shared-kernel';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Invoice, InvoiceSource, InvoiceSourceType, InvoiceStatus } from '../domain/invoice';
import { InvoiceRepository } from '../domain/invoice.repository';

@Injectable()
export class PrismaInvoiceRepository extends InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async existsForSource(source: InvoiceSource): Promise<boolean> {
    const count = await this.prisma.billingInvoice.count({
      where: { sourceType: source.type, sourceId: source.id },
    });
    return count > 0;
  }

  async findByPayer(payerId: string): Promise<Invoice[]> {
    const rows = await this.prisma.billingInvoice.findMany({
      where: { payerId },
      include: { lines: true },
      orderBy: { issuedAt: 'asc' },
    });
    return rows.map(toDomain);
  }

  async findBySource(source: InvoiceSource): Promise<Invoice | null> {
    const row = await this.prisma.billingInvoice.findUnique({
      where: { sourceType_sourceId: { sourceType: source.type, sourceId: source.id } },
      include: { lines: true },
    });
    return row ? toDomain(row) : null;
  }

  async save(invoice: Invoice): Promise<void> {
    const s = invoice.toSnapshot();
    await this.prisma.billingInvoice.create({
      data: {
        id: s.id,
        payerId: s.payerId,
        sourceType: s.source.type,
        sourceId: s.source.id,
        status: s.status,
        totalCents: invoice.totalCents,
        issuedAt: s.issuedAt,
        lines: { create: s.lines.map((line) => ({ id: newId(), ...line })) },
      },
    });
  }
}

function toDomain(row: BillingInvoice & { lines: BillingInvoiceLine[] }): Invoice {
  return Invoice.restore({
    id: row.id,
    payerId: row.payerId,
    source: { type: row.sourceType as InvoiceSourceType, id: row.sourceId },
    status: row.status as InvoiceStatus,
    issuedAt: row.issuedAt,
    lines: row.lines.map(({ code, description, amountCents }) => ({ code, description, amountCents })),
  });
}
