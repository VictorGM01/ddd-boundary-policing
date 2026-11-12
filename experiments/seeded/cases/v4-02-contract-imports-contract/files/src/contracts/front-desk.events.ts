import type { PersonId } from '@/shared-kernel';
import type { AppointmentScheduled } from './scheduling.events';

export const FrontDeskEvents = {
  VisitorCheckedIn: 'front-desk.visitor-checked-in',
} as const;

export interface VisitorCheckedIn extends Omit<AppointmentScheduled, 'personId'> {
  visitId: string;
  personId: PersonId;
  checkedInAt: string;
}
