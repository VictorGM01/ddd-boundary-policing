import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ClinicalEvents, EncounterCompleted } from '@/contracts/clinical.events';

@Injectable()
export class ClinicalEventsListener {
  readonly attended = new Set<string>();

  @OnEvent(ClinicalEvents.EncounterCompleted)
  onEncounterCompleted(event: EncounterCompleted): void {
    this.attended.add(event.appointmentId);
  }
}
