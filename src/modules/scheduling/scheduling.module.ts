import { Module } from '@nestjs/common';
import { AppointmentsController } from './api/appointments.controller';
import { AppointmentsService } from './application/appointments.service';
import { AppointmentRepository } from './domain/appointment.repository';
import { PrismaAppointmentRepository } from './infrastructure/prisma-appointment.repository';

@Module({
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    { provide: AppointmentRepository, useClass: PrismaAppointmentRepository },
  ],
})
export class SchedulingModule {}
