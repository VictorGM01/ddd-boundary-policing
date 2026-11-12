import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FrontDeskEvents, VisitorCheckedIn } from '@/contracts/front-desk.events';
import { Clock, eventEnvelope, newId, PersonId, PractitionerId } from '@/shared-kernel';
import { Visit } from '../domain/visit';
import { VisitRepository } from '../domain/visit.repository';
import { WaitingQueue } from '../domain/waiting-queue';

export interface ExpectVisitorCommand {
  appointmentId: string;
  personId: PersonId;
  practitionerId: PractitionerId;
  expectedAt: Date;
}

@Injectable()
export class VisitsService {
  constructor(
    private readonly visits: VisitRepository,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async expectVisitor(command: ExpectVisitorCommand): Promise<void> {
    if (await this.visits.findByAppointmentId(command.appointmentId)) {
      return;
    }
    await this.visits.save(Visit.expect({ id: newId(), ...command }));
  }

  async cancelExpectedVisit(appointmentId: string): Promise<void> {
    const visit = await this.visits.findByAppointmentId(appointmentId);
    if (!visit) {
      return;
    }
    visit.cancel();
    await this.visits.save(visit);
  }

  async checkIn(appointmentId: string): Promise<Visit> {
    const visit = await this.visits.findByAppointmentId(appointmentId);
    if (!visit) {
      throw new NotFoundException(`No expected visit for appointment ${appointmentId}`);
    }
    visit.checkIn(this.clock.now());
    await this.visits.save(visit);

    const s = visit.toSnapshot();
    const event: VisitorCheckedIn = {
      ...eventEnvelope(this.clock.now()),
      visitId: s.id,
      appointmentId: s.appointmentId,
      personId: s.personId,
      practitionerId: s.practitionerId,
      checkedInAt: (s.checkedInAt as Date).toISOString(),
    };
    await this.events.emitAsync(FrontDeskEvents.VisitorCheckedIn, event);
    return visit;
  }

  async waitingQueue(): Promise<WaitingQueue> {
    return WaitingQueue.of(await this.visits.findCheckedIn());
  }
}
