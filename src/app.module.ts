import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainErrorFilter } from './infrastructure/http/domain-error.filter';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { BillingModule } from './modules/billing/billing.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { FrontDeskModule } from './modules/front-desk/front-desk.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { SharedKernelModule } from './shared-kernel/shared-kernel.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SharedKernelModule,
    PrismaModule,
    SchedulingModule,
    FrontDeskModule,
    ClinicalModule,
    BillingModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class AppModule {}
