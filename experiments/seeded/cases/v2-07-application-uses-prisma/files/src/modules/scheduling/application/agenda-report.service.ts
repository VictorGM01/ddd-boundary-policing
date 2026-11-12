import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class AgendaReportService {
  constructor(private readonly prisma: PrismaService) {}

  async countFor(practitionerId: string): Promise<number> {
    return this.prisma.schedulingAppointment.count({ where: { practitionerId } });
  }
}
