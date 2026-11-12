import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class ArrivalCheckQuery {
  constructor(private readonly prisma: PrismaService) {}

  async hasArrived(appointmentId: string): Promise<boolean> {
    const visit = await this.prisma['frontDeskVisit'].findUnique({ where: { appointmentId } });
    return visit?.status === 'CHECKED_IN';
  }
}
