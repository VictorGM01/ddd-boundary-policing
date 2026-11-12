import type { Appointment } from './appointment';
import { TimeSlot } from './time-slot';

export function isFree(slot: TimeSlot, agenda: readonly Appointment[]): boolean {
  return agenda.every((a) => a.status !== 'SCHEDULED' || !slot.overlaps(TimeSlot.of(a.startsAt, (a.endsAt.getTime() - a.startsAt.getTime()) / 60_000)));
}
