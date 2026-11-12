import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppointmentNoShow, SchedulingEvents } from '@/contracts/scheduling.events';
import { InvoicingService } from '../application/invoicing.service';

@Injectable()
export class SchedulingEventsListener {
  constructor(private readonly invoicing: InvoicingService) {}

  @OnEvent(SchedulingEvents.AppointmentNoShow)
  async onAppointmentNoShow(event: AppointmentNoShow): Promise<void> {
    await this.invoicing.chargeNoShow({ appointmentId: event.appointmentId, payerId: event.personId });
  }
}
