import type { IntegrationEvent, PersonId, PractitionerId } from '@/shared-kernel';

export const SchedulingEvents = {
  AppointmentScheduled: 'scheduling.appointment-scheduled',
  AppointmentCancelled: 'scheduling.appointment-cancelled',
  AppointmentNoShow: 'scheduling.appointment-no-show',
} as const;

export interface AppointmentScheduled extends IntegrationEvent {
  appointmentId: string;
  personId: PersonId;
  practitionerId: PractitionerId;
  startsAt: string;
  endsAt: string;
}

export interface AppointmentCancelled extends IntegrationEvent {
  appointmentId: string;
  personId: PersonId;
  reason: string;
}

export interface AppointmentNoShow extends IntegrationEvent {
  appointmentId: string;
  personId: PersonId;
  startsAt: string;
}
