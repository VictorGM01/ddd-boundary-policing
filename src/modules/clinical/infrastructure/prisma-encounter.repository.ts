import { Injectable } from '@nestjs/common';
import type { ClinicalEncounter } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Encounter, EncounterStatus } from '../domain/encounter';
import { EncounterRepository } from '../domain/encounter.repository';

@Injectable()
export class PrismaEncounterRepository extends EncounterRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Encounter | null> {
    const row = await this.prisma.clinicalEncounter.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<Encounter | null> {
    const row = await this.prisma.clinicalEncounter.findUnique({ where: { appointmentId } });
    return row ? toDomain(row) : null;
  }

  async save(encounter: Encounter): Promise<void> {
    const { id, diagnosisCodes, procedureCodes, ...rest } = encounter.toSnapshot();
    const data = {
      ...rest,
      diagnosisCodes: JSON.stringify(diagnosisCodes),
      procedureCodes: JSON.stringify(procedureCodes),
    };
    await this.prisma.clinicalEncounter.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
}

function toDomain(row: ClinicalEncounter): Encounter {
  return Encounter.restore({
    ...row,
    status: row.status as EncounterStatus,
    diagnosisCodes: JSON.parse(row.diagnosisCodes) as string[],
    procedureCodes: JSON.parse(row.procedureCodes) as string[],
  });
}
