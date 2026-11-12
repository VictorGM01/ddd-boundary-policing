import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AppointmentScheduled } from '@/contracts/scheduling.events';
import { FixedClock } from '@/shared-kernel';
import { Visit } from '../domain/visit';
import { VisitRepository } from '../domain/visit.repository';
import { VisitsService } from './visits.service';

class InMemoryVisits extends VisitRepository {
  readonly items = new Map<string, Visit>();
  async findByAppointmentId(id: string) {
    return [...this.items.values()].find((v) => v.toSnapshot().appointmentId === id) ?? null;
  }
  async findCheckedIn() {
    return [...this.items.values()].filter((v) => v.status === 'CHECKED_IN');
  }
  async save(visit: Visit) {
    this.items.set(visit.id, visit);
  }
}

it('expects a visitor once per appointment', async () => {
  const repo = new InMemoryVisits();
  const service = new VisitsService(repo, new FixedClock(new Date()), new EventEmitter2());
  const event = { appointmentId: 'a', personId: 'p', practitionerId: 'd', startsAt: new Date().toISOString() } as AppointmentScheduled;
  await service.expectVisitor({ ...event, expectedAt: new Date(event.startsAt) });
  await service.expectVisitor({ ...event, expectedAt: new Date(event.startsAt) });
  expect(repo.items.size).toBe(1);
});
