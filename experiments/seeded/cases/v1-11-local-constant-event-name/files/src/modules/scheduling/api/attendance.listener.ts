import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

const ENCOUNTER_DONE = 'clinical.encounter-completed';

interface EncounterDone {
  appointmentId: string;
}

@Injectable()
export class AttendanceListener {
  readonly attended = new Set<string>();

  @OnEvent(ENCOUNTER_DONE)
  onDone(event: EncounterDone): void {
    this.attended.add(event.appointmentId);
  }
}
