import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class DestructuredDebtsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async count(patientId: string): Promise<number> {
    const { billingInvoice } = this.prisma;
    return billingInvoice.count({ where: { payerId: patientId } });
  }
}
