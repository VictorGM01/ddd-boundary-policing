import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AppointmentsService } from '../application/appointments.service';
import type { Appointment } from '../domain/appointment';

interface ScheduleAppointmentBody {
  practitionerId?: string;
  startsAt?: string;
  durationMinutes?: number;
  requester?: { personId?: string; name?: string; phone?: string };
}

@Controller('scheduling/appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  async schedule(@Body() body: ScheduleAppointmentBody) {
    const startsAt = new Date(body.startsAt ?? '');
    const requester = body.requester;
    if (!body.practitionerId || Number.isNaN(startsAt.getTime()) || !requester?.personId || !requester.name) {
      throw new BadRequestException('practitionerId, startsAt and requester{personId,name} are required');
    }
    const appointment = await this.appointments.schedule({
      practitionerId: body.practitionerId,
      startsAt,
      durationMinutes: body.durationMinutes,
      requester: { personId: requester.personId, name: requester.name, phone: requester.phone ?? '' },
    });
    return toResponse(appointment);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return toResponse(await this.appointments.get(id));
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(@Param('id') id: string, @Body() body: { reason?: string }) {
    return toResponse(await this.appointments.cancel(id, body.reason ?? 'not informed'));
  }

  @Post(':id/no-show')
  @HttpCode(200)
  async noShow(@Param('id') id: string) {
    return toResponse(await this.appointments.markNoShow(id));
  }
}

function toResponse(appointment: Appointment) {
  const s = appointment.toSnapshot();
  return {
    id: s.id,
    practitionerId: s.practitionerId,
    requester: s.requester,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    status: s.status,
    cancelReason: s.cancelReason,
  };
}
