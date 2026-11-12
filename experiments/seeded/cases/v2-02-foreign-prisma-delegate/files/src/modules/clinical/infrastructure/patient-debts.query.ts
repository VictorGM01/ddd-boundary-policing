import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class PatientDebtsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async openDebtCents(patientId: string): Promise<number> {
    const invoices = await this.prisma.billingInvoice.findMany({ where: { payerId: patientId, status: 'OPEN' } });
    return invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
  }
}
