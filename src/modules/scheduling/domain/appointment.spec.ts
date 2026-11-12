import { Appointment, Requester } from './appointment';
import {
  AppointmentInPastError,
  InvalidAppointmentTransitionError,
  NoShowBeforeStartError,
  SlotUnavailableError,
} from './appointment.errors';

const now = new Date('2026-03-02T09:00:00Z');
const requester: Requester = { personId: 'person-1', name: 'Ana', phone: '11999990000' };

function scheduleAt(iso: string, id = 'a-1', agenda: Appointment[] = []): Appointment {
  return Appointment.schedule(
    { id, practitionerId: 'dr-1', requester, startsAt: new Date(iso) },
    now,
    agenda,
  );
}

describe('Appointment', () => {
  it('schedules a 30-minute slot in the future', () => {
    const appointment = scheduleAt('2026-03-02T10:00:00Z');

    expect(appointment.status).toBe('SCHEDULED');
    expect(appointment.endsAt.toISOString()).toBe('2026-03-02T10:30:00.000Z');
  });

  it('refuses to schedule in the past', () => {
    expect(() => scheduleAt('2026-03-02T08:59:00Z')).toThrow(AppointmentInPastError);
  });

  it('refuses a slot that overlaps another scheduled appointment of the same practitioner', () => {
    const existing = scheduleAt('2026-03-02T10:00:00Z');

    expect(() => scheduleAt('2026-03-02T10:15:00Z', 'a-2', [existing])).toThrow(SlotUnavailableError);
  });

  it('accepts a back-to-back slot', () => {
    const existing = scheduleAt('2026-03-02T10:00:00Z');

    expect(() => scheduleAt('2026-03-02T10:30:00Z', 'a-2', [existing])).not.toThrow();
  });

  it('frees the slot once the overlapping appointment is cancelled', () => {
    const existing = scheduleAt('2026-03-02T10:00:00Z');
    existing.cancel('patient request');

    expect(() => scheduleAt('2026-03-02T10:00:00Z', 'a-2', [existing])).not.toThrow();
  });

  it('cannot be cancelled twice', () => {
    const appointment = scheduleAt('2026-03-02T10:00:00Z');
    appointment.cancel('first');

    expect(() => appointment.cancel('second')).toThrow(InvalidAppointmentTransitionError);
  });

  it('records a no-show only after the start time', () => {
    const appointment = scheduleAt('2026-03-02T10:00:00Z');

    expect(() => appointment.markNoShow(new Date('2026-03-02T09:59:00Z'))).toThrow(NoShowBeforeStartError);
    appointment.markNoShow(new Date('2026-03-02T10:20:00Z'));
    expect(appointment.status).toBe('NO_SHOW');
  });

  it('cannot record a no-show for a cancelled appointment', () => {
    const appointment = scheduleAt('2026-03-02T10:00:00Z');
    appointment.cancel('reason');

    expect(() => appointment.markNoShow(new Date('2026-03-02T10:20:00Z'))).toThrow(
      InvalidAppointmentTransitionError,
    );
  });
});
