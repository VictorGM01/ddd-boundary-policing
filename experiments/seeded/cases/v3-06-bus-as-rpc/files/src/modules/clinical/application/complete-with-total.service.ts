import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClinicalEvents, EncounterCompleted } from '@/contracts/clinical.events';

@Injectable()
export class CompleteWithTotalService {
  constructor(private readonly events: EventEmitter2) {}

  async publishAndGetTotal(event: EncounterCompleted): Promise<number> {
    const [totalCents] = (await this.events.emitAsync(ClinicalEvents.EncounterCompleted, event)) as number[];
    return totalCents;
  }
}
