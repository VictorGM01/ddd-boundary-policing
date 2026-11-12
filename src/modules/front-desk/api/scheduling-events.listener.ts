import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppointmentCancelled, AppointmentScheduled, SchedulingEvents } from '@/contracts/scheduling.events';
import { VisitsService } from '../application/visits.service';

@Injectable()
export class SchedulingEventsListener {
  constructor(private readonly visits: VisitsService) {}

  @OnEvent(SchedulingEvents.AppointmentScheduled)
  async onAppointmentScheduled(event: AppointmentScheduled): Promise<void> {
    await this.visits.expectVisitor({
      appointmentId: event.appointmentId,
      personId: event.personId,
      practitionerId: event.practitionerId,
      expectedAt: new Date(event.startsAt),
    });
  }

  @OnEvent(SchedulingEvents.AppointmentCancelled)
  async onAppointmentCancelled(event: AppointmentCancelled): Promise<void> {
    await this.visits.cancelExpectedVisit(event.appointmentId);
  }
}
