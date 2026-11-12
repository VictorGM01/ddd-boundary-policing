import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { EncountersService } from '../application/encounters.service';
import type { Encounter } from '../domain/encounter';

interface CompleteEncounterBody {
  notes?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];
}

@Controller('clinical/encounters')
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Get()
  async findByAppointment(@Query('appointmentId') appointmentId?: string) {
    if (!appointmentId) {
      throw new BadRequestException('appointmentId is required');
    }
    return toResponse(await this.encounters.findByAppointment(appointmentId));
  }

  @Post(':id/start')
  @HttpCode(200)
  async start(@Param('id') id: string) {
    return toResponse(await this.encounters.start(id));
  }

  @Post(':id/complete')
  @HttpCode(200)
  async complete(@Param('id') id: string, @Body() body: CompleteEncounterBody) {
    return toResponse(
      await this.encounters.complete(id, {
        notes: body.notes ?? '',
        diagnosisCodes: body.diagnosisCodes ?? [],
        procedureCodes: body.procedureCodes ?? [],
      }),
    );
  }
}

function toResponse(encounter: Encounter) {
  const s = encounter.toSnapshot();
  return {
    id: s.id,
    appointmentId: s.appointmentId,
    patientId: s.patientId,
    status: s.status,
    procedureCodes: s.procedureCodes,
    diagnosisCodes: s.diagnosisCodes,
  };
}
