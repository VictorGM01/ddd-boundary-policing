import { Inject, Injectable } from '@nestjs/common';
import { SLOT_MINUTES } from './slot-config';

@Injectable()
export class SlotPlannerService {
  constructor(@Inject(SLOT_MINUTES) private readonly minutes: number) {}

  async slotsPerDay(): Promise<number> {
    const { TimeSlotMath } = await import('./time-slot-math');
    return TimeSlotMath.perDay(this.minutes);
  }
}
