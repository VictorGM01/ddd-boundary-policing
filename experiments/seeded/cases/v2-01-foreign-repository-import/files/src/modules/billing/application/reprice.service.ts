import { Injectable } from '@nestjs/common';
import { EncounterRepository } from '../../clinical/domain/encounter.repository';

@Injectable()
export class RepriceService {
  constructor(private readonly encounters: EncounterRepository) {}

  async codesOf(encounterId: string): Promise<string[]> {
    const encounter = await this.encounters.findById(encounterId);
    return encounter?.toSnapshot().procedureCodes ?? [];
  }
}
