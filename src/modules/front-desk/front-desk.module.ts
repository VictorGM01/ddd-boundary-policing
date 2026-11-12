import { Module } from '@nestjs/common';
import { SchedulingEventsListener } from './api/scheduling-events.listener';
import { VisitsController } from './api/visits.controller';
import { VisitsService } from './application/visits.service';
import { VisitRepository } from './domain/visit.repository';
import { PrismaVisitRepository } from './infrastructure/prisma-visit.repository';

@Module({
  controllers: [VisitsController],
  providers: [
    VisitsService,
    SchedulingEventsListener,
    { provide: VisitRepository, useClass: PrismaVisitRepository },
  ],
})
export class FrontDeskModule {}
