import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClinicalEvents, EncounterCompleted } from '@/contracts/clinical.events';
import { Clock, eventEnvelope, newId, PersonId, PractitionerId } from '@/shared-kernel';
import { Encounter, EncounterRecord } from '../domain/encounter';
import { EncounterRepository } from '../domain/encounter.repository';

export interface RegisterArrivalCommand {
  appointmentId: string;
  patientId: PersonId;
  practitionerId: PractitionerId;
  arrivedAt: Date;
}

@Injectable()
export class EncountersService {
  constructor(
    private readonly encounters: EncounterRepository,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async registerArrival(command: RegisterArrivalCommand): Promise<void> {
    if (await this.encounters.findByAppointmentId(command.appointmentId)) {
      return;
    }
    await this.encounters.save(Encounter.open({ id: newId(), ...command }));
  }

  async start(encounterId: string): Promise<Encounter> {
    const encounter = await this.load(encounterId);
    encounter.start(this.clock.now());
    await this.encounters.save(encounter);
    return encounter;
  }

  async complete(encounterId: string, record: EncounterRecord): Promise<Encounter> {
    const encounter = await this.load(encounterId);
    encounter.complete(record, this.clock.now());
    await this.encounters.save(encounter);

    const s = encounter.toSnapshot();
    const event: EncounterCompleted = {
      ...eventEnvelope(this.clock.now()),
      encounterId: s.id,
      appointmentId: s.appointmentId,
      personId: s.patientId,
      procedureCodes: s.procedureCodes,
      completedAt: (s.completedAt as Date).toISOString(),
    };
    await this.events.emitAsync(ClinicalEvents.EncounterCompleted, event);
    return encounter;
  }

  async findByAppointment(appointmentId: string): Promise<Encounter> {
    const encounter = await this.encounters.findByAppointmentId(appointmentId);
    if (!encounter) {
      throw new NotFoundException(`No encounter for appointment ${appointmentId}`);
    }
    return encounter;
  }

  private async load(encounterId: string): Promise<Encounter> {
    const encounter = await this.encounters.findById(encounterId);
    if (!encounter) {
      throw new NotFoundException(`Encounter ${encounterId} not found`);
    }
    return encounter;
  }
}
