import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { EncounterCompleted } from '@/contracts/clinical.events';
import { ENCOUNTER_COMPLETED } from './event-names';

@Injectable()
export class Republisher {
  constructor(private readonly events: EventEmitter2) {}

  async republish(event: EncounterCompleted): Promise<void> {
    await this.events.emitAsync(ENCOUNTER_COMPLETED, event);
  }
}
