import { Appointment } from '@/modules/scheduling';

export function isLate(appointment: Appointment, now: Date): boolean {
  return now > appointment.startsAt;
}
