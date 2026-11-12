import { Injectable, NotFoundException } from '@nestjs/common';
import { Clock, newId } from '@/shared-kernel';
import { Appointment } from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';

@Injectable()
export class RescheduleService {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clock: Clock,
  ) {}

  async reschedule(appointmentId: string, startsAt: Date): Promise<Appointment> {
    const current = await this.appointments.findById(appointmentId);
    if (!current) throw new NotFoundException(appointmentId);
    const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
    const agenda = await this.appointments.findScheduledOverlapping(current.practitionerId, startsAt, endsAt);
    const next = Appointment.schedule(
      { id: newId(), practitionerId: current.practitionerId, requester: current.requester, startsAt },
      this.clock.now(),
      agenda,
    );
    current.cancel('rescheduled');
    await this.appointments.save(current);
    await this.appointments.save(next);
    return next;
  }
}
