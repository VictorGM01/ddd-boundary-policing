import { Injectable } from '@nestjs/common';
import type { SchedulingAppointment } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Appointment, AppointmentStatus } from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';

@Injectable()
export class PrismaAppointmentRepository extends AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Appointment | null> {
    const row = await this.prisma.schedulingAppointment.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findScheduledOverlapping(practitionerId: string, from: Date, to: Date): Promise<Appointment[]> {
    const rows = await this.prisma.schedulingAppointment.findMany({
      where: { practitionerId, status: 'SCHEDULED', startsAt: { lt: to }, endsAt: { gt: from } },
    });
    return rows.map(toDomain);
  }

  async save(appointment: Appointment): Promise<void> {
    const s = appointment.toSnapshot();
    const data = {
      practitionerId: s.practitionerId,
      requesterId: s.requester.personId,
      requesterName: s.requester.name,
      requesterPhone: s.requester.phone,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
      cancelReason: s.cancelReason,
    };
    await this.prisma.schedulingAppointment.upsert({
      where: { id: s.id },
      create: { id: s.id, ...data },
      update: data,
    });
  }
}

function toDomain(row: SchedulingAppointment): Appointment {
  return Appointment.restore({
    id: row.id,
    practitionerId: row.practitionerId,
    requester: { personId: row.requesterId, name: row.requesterName, phone: row.requesterPhone },
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status as AppointmentStatus,
    cancelReason: row.cancelReason,
  });
}
