import type { Visit } from './visit';

export abstract class VisitRepository {
  abstract findByAppointmentId(appointmentId: string): Promise<Visit | null>;
  abstract findCheckedIn(): Promise<Visit[]>;
  abstract save(visit: Visit): Promise<void>;
}
