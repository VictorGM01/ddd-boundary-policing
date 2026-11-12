import { Module } from '@nestjs/common';
import { EncountersController } from './api/encounters.controller';
import { FrontDeskEventsListener } from './api/front-desk-events.listener';
import { EncountersService } from './application/encounters.service';
import { EncounterRepository } from './domain/encounter.repository';
import { PrismaEncounterRepository } from './infrastructure/prisma-encounter.repository';

@Module({
  controllers: [EncountersController],
  providers: [
    EncountersService,
    FrontDeskEventsListener,
    { provide: EncounterRepository, useClass: PrismaEncounterRepository },
  ],
})
export class ClinicalModule {}
