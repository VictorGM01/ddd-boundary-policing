import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentScheduled, SchedulingEvents } from '@/contracts/scheduling.events';
import { FixedClock } from '@/shared-kernel';
import { Appointment } from '../domain/appointment';
import { AppointmentRepository } from '../domain/appointment.repository';
import { SlotUnavailableError } from '../domain/appointment.errors';
import { AppointmentsService } from './appointments.service';

class InMemoryAppointmentRepository extends AppointmentRepository {
  readonly items = new Map<string, Appointment>();

  async findById(id: string) {
    return this.items.get(id) ?? null;
  }

  async findScheduledOverlapping(practitionerId: string, from: Date, to: Date) {
    return [...this.items.values()].filter(
      (a) => a.practitionerId === practitionerId && a.status === 'SCHEDULED' && a.startsAt < to && from < a.endsAt,
    );
  }

  async save(appointment: Appointment) {
    this.items.set(appointment.id, Appointment.restore(appointment.toSnapshot()));
  }
}

describe('AppointmentsService', () => {
  const clock = new FixedClock(new Date('2026-03-02T09:00:00Z'));
  let repository: InMemoryAppointmentRepository;
  let events: EventEmitter2;
  let service: AppointmentsService;

  beforeEach(() => {
    repository = new InMemoryAppointmentRepository();
    events = new EventEmitter2();
    service = new AppointmentsService(repository, clock, events);
  });

  const command = {
    practitionerId: 'dr-1',
    requester: { personId: 'person-1', name: 'Ana', phone: '' },
    startsAt: new Date('2026-03-02T10:00:00Z'),
  };

  it('persists the appointment and publishes AppointmentScheduled with the published payload', async () => {
    const published: AppointmentScheduled[] = [];
    events.on(SchedulingEvents.AppointmentScheduled, (e: AppointmentScheduled) => published.push(e));

    const appointment = await service.schedule(command);

    expect(repository.items.get(appointment.id)?.status).toBe('SCHEDULED');
    expect(published).toEqual([
      expect.objectContaining({
        appointmentId: appointment.id,
        personId: 'person-1',
        practitionerId: 'dr-1',
        startsAt: '2026-03-02T10:00:00.000Z',
        endsAt: '2026-03-02T10:30:00.000Z',
      }),
    ]);
  });

  it('rejects a double booking against what is already persisted', async () => {
    await service.schedule(command);

    await expect(service.schedule({ ...command, startsAt: new Date('2026-03-02T10:10:00Z') })).rejects.toThrow(
      SlotUnavailableError,
    );
  });
});
