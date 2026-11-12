import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

interface EncounterDone {
  appointmentId: string;
}

@Injectable()
export class AttendanceListener {
  readonly attended = new Set<string>();

  @OnEvent('clinical.encounter-completed')
  onDone(event: EncounterDone): void {
    this.attended.add(event.appointmentId);
  }
}
