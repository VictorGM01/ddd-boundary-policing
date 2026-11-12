import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async totalPaid(invoiceId: string): Promise<number> {
    const rows = await this.prisma.billingPayment.findMany({ where: { invoiceId } });
    const invoice = await this.prisma.billingInvoice.findUnique({ where: { id: invoiceId } });
    return invoice ? rows.reduce((sum, row) => sum + row.amountCents, 0) : 0;
  }
}
