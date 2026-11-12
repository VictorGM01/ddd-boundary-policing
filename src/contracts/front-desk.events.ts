import type { IntegrationEvent, PersonId, PractitionerId } from '@/shared-kernel';

export const FrontDeskEvents = {
  VisitorCheckedIn: 'front-desk.visitor-checked-in',
} as const;

export interface VisitorCheckedIn extends IntegrationEvent {
  visitId: string;
  appointmentId: string;
  personId: PersonId;
  practitionerId: PractitionerId;
  checkedInAt: string;
}
