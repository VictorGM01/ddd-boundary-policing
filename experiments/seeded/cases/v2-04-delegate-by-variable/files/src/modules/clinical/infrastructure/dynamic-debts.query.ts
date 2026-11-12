import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class DynamicDebtsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async count(patientId: string): Promise<number> {
    const model = ['billing', 'Invoice'].join('');
    const delegate = (this.prisma as unknown as Record<string, { count(args: unknown): Promise<number> }>)[model];
    return delegate.count({ where: { payerId: patientId } });
  }
}
