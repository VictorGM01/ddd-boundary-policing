import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { VisitsService } from '../application/visits.service';

@Controller('front-desk')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Post('visits/:appointmentId/check-in')
  @HttpCode(200)
  async checkIn(@Param('appointmentId') appointmentId: string) {
    const visit = await this.visits.checkIn(appointmentId);
    const queue = await this.visits.waitingQueue();
    const s = visit.toSnapshot();
    return {
      visitId: s.id,
      appointmentId: s.appointmentId,
      status: s.status,
      checkedInAt: s.checkedInAt?.toISOString() ?? null,
      queuePosition: queue.positionOf(s.id),
    };
  }

  @Get('queue')
  async queue() {
    const queue = await this.visits.waitingQueue();
    return queue.entries().map((visit, index) => {
      const s = visit.toSnapshot();
      return { position: index + 1, visitId: s.id, appointmentId: s.appointmentId, personId: s.personId };
    });
  }
}
