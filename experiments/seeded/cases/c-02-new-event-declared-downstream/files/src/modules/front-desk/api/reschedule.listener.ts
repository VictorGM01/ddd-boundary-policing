import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppointmentRescheduled, SchedulingEvents } from '@/contracts/scheduling.events';
import { VisitsService } from '../application/visits.service';

@Injectable()
export class RescheduleListener {
  constructor(private readonly visits: VisitsService) {}

  @OnEvent(SchedulingEvents.AppointmentRescheduled)
  async onRescheduled(event: AppointmentRescheduled): Promise<void> {
    await this.visits.cancelExpectedVisit(event.appointmentId);
  }
}
