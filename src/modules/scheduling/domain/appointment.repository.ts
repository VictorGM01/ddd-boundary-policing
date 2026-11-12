import type { PractitionerId } from '@/shared-kernel';
import type { Appointment } from './appointment';

export abstract class AppointmentRepository {
  abstract findById(id: string): Promise<Appointment | null>;
  abstract findScheduledOverlapping(
    practitionerId: PractitionerId,
    from: Date,
    to: Date,
  ): Promise<Appointment[]>;
  abstract save(appointment: Appointment): Promise<void>;
}
