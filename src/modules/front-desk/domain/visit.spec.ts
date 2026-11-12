import { Visit } from './visit';
import { CheckInNotAllowedError, VisitAlreadyCheckedInError } from './visit.errors';
import { WaitingQueue } from './waiting-queue';

function expected(id = 'v-1'): Visit {
  return Visit.expect({
    id,
    appointmentId: `appt-${id}`,
    personId: 'person-1',
    practitionerId: 'dr-1',
    expectedAt: new Date('2026-03-02T10:00:00Z'),
  });
}

describe('Visit', () => {
  it('checks in an expected visitor and records the arrival time', () => {
    const visit = expected();
    const arrival = new Date('2026-03-02T09:50:00Z');

    visit.checkIn(arrival);

    expect(visit.status).toBe('CHECKED_IN');
    expect(visit.checkedInAt).toEqual(arrival);
  });

  it('refuses to check in a cancelled visit', () => {
    const visit = expected();
    visit.cancel();

    expect(() => visit.checkIn(new Date())).toThrow(CheckInNotAllowedError);
  });

  it('refuses a second check-in', () => {
    const visit = expected();
    visit.checkIn(new Date());

    expect(() => visit.checkIn(new Date())).toThrow(VisitAlreadyCheckedInError);
  });

  it('keeps a checked-in visit when the appointment is cancelled afterwards', () => {
    const visit = expected();
    visit.checkIn(new Date());

    visit.cancel();

    expect(visit.status).toBe('CHECKED_IN');
  });
});

describe('WaitingQueue', () => {
  it('orders checked-in visitors by arrival and ignores the others', () => {
    const late = expected('late');
    const early = expected('early');
    const notArrived = expected('absent');
    late.checkIn(new Date('2026-03-02T09:55:00Z'));
    early.checkIn(new Date('2026-03-02T09:40:00Z'));

    const queue = WaitingQueue.of([late, notArrived, early]);

    expect(queue.size).toBe(2);
    expect(queue.positionOf('early')).toBe(1);
    expect(queue.positionOf('late')).toBe(2);
    expect(queue.positionOf('absent')).toBeNull();
  });
});
