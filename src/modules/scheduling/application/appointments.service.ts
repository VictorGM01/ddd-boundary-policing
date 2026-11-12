import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AppointmentCancelled,
  AppointmentNoShow,
  AppointmentScheduled,
  SchedulingEvents,
} from '@/contracts/scheduling.events';
import { Clock, eventEnvelope, newId, PractitionerId } from '@/shared-kernel';
import { Appointment, DEFAULT_DURATION_MINUTES, Requester } from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';

export interface ScheduleAppointmentCommand {
  practitionerId: PractitionerId;
  requester: Requester;
  startsAt: Date;
  durationMinutes?: number;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async schedule(command: ScheduleAppointmentCommand): Promise<Appointment> {
    const duration = command.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    const endsAt = new Date(command.startsAt.getTime() + duration * 60_000);
    const agenda = await this.appointments.findScheduledOverlapping(
      command.practitionerId,
      command.startsAt,
      endsAt,
    );
    const appointment = Appointment.schedule(
      { id: newId(), ...command, durationMinutes: duration },
      this.clock.now(),
      agenda,
    );
    await this.appointments.save(appointment);

    const event: AppointmentScheduled = {
      ...eventEnvelope(this.clock.now()),
      appointmentId: appointment.id,
      personId: appointment.requester.personId,
      practitionerId: appointment.practitionerId,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
    };
    await this.events.emitAsync(SchedulingEvents.AppointmentScheduled, event);
    return appointment;
  }

  async cancel(appointmentId: string, reason: string): Promise<Appointment> {
    const appointment = await this.load(appointmentId);
    appointment.cancel(reason);
    await this.appointments.save(appointment);

    const event: AppointmentCancelled = {
      ...eventEnvelope(this.clock.now()),
      appointmentId: appointment.id,
      personId: appointment.requester.personId,
      reason,
    };
    await this.events.emitAsync(SchedulingEvents.AppointmentCancelled, event);
    return appointment;
  }

  async markNoShow(appointmentId: string): Promise<Appointment> {
    const appointment = await this.load(appointmentId);
    appointment.markNoShow(this.clock.now());
    await this.appointments.save(appointment);

    const event: AppointmentNoShow = {
      ...eventEnvelope(this.clock.now()),
      appointmentId: appointment.id,
      personId: appointment.requester.personId,
      startsAt: appointment.startsAt.toISOString(),
    };
    await this.events.emitAsync(SchedulingEvents.AppointmentNoShow, event);
    return appointment;
  }

  async get(appointmentId: string): Promise<Appointment> {
    return this.load(appointmentId);
  }

  private async load(appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException(`Appointment ${appointmentId} not found`);
    }
    return appointment;
  }
}
