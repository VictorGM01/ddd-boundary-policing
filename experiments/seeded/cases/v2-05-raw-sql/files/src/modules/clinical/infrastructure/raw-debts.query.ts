import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class RawDebtsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async total(patientId: string): Promise<number> {
    const rows = await this.prisma.$queryRawUnsafe<{ total: number }[]>(
      'SELECT SUM(totalCents) AS total FROM BillingInvoice WHERE payerId = ?',
      patientId,
    );
    return rows[0]?.total ?? 0;
  }
}
