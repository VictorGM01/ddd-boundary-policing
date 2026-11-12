import { Injectable } from '@nestjs/common';
import type { FrontDeskVisit } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Visit, VisitStatus } from '../domain/visit';
import { VisitRepository } from '../domain/visit.repository';

@Injectable()
export class PrismaVisitRepository extends VisitRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByAppointmentId(appointmentId: string): Promise<Visit | null> {
    const row = await this.prisma.frontDeskVisit.findUnique({ where: { appointmentId } });
    return row ? toDomain(row) : null;
  }

  async findCheckedIn(): Promise<Visit[]> {
    const rows = await this.prisma.frontDeskVisit.findMany({ where: { status: 'CHECKED_IN' } });
    return rows.map(toDomain);
  }

  async save(visit: Visit): Promise<void> {
    const { id, ...data } = visit.toSnapshot();
    await this.prisma.frontDeskVisit.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
}

function toDomain(row: FrontDeskVisit): Visit {
  return Visit.restore({ ...row, status: row.status as VisitStatus });
}
