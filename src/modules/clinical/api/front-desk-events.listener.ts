import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FrontDeskEvents, VisitorCheckedIn } from '@/contracts/front-desk.events';
import { EncountersService } from '../application/encounters.service';

@Injectable()
export class FrontDeskEventsListener {
  constructor(private readonly encounters: EncountersService) {}

  @OnEvent(FrontDeskEvents.VisitorCheckedIn)
  async onVisitorCheckedIn(event: VisitorCheckedIn): Promise<void> {
    await this.encounters.registerArrival({
      appointmentId: event.appointmentId,
      patientId: event.personId,
      practitionerId: event.practitionerId,
      arrivedAt: new Date(event.checkedInAt),
    });
  }
}
