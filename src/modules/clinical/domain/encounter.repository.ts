import type { Encounter } from './encounter';

export abstract class EncounterRepository {
  abstract findById(id: string): Promise<Encounter | null>;
  abstract findByAppointmentId(appointmentId: string): Promise<Encounter | null>;
  abstract save(encounter: Encounter): Promise<void>;
}
