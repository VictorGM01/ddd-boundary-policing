import type { SchedulingAppointment } from '@prisma/client';

export function visitorNameFrom(row: SchedulingAppointment): string {
  return row.requesterName;
}
