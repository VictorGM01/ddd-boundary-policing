import type { EncounterRepository } from '../modules/clinical/domain/encounter.repository';

export async function hasOpenEncounter(repo: EncounterRepository, appointmentId: string): Promise<boolean> {
  return (await repo.findByAppointmentId(appointmentId)) !== null;
}
