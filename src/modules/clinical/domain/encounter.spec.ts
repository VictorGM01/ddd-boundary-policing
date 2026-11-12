import { Encounter } from './encounter';
import { InvalidEncounterTransitionError, ProcedureRequiredError } from './encounter.errors';

function arrived(): Encounter {
  return Encounter.open({
    id: 'e-1',
    appointmentId: 'appt-1',
    patientId: 'person-1',
    practitionerId: 'dr-1',
    arrivedAt: new Date('2026-03-02T09:50:00Z'),
  });
}

const record = { notes: 'Headache for 3 days', diagnosisCodes: ['R51'], procedureCodes: ['10101012'] };

describe('Encounter', () => {
  it('opens with the patient waiting', () => {
    expect(arrived().status).toBe('WAITING');
  });

  it('completes a started encounter and keeps deduplicated procedure codes', () => {
    const encounter = arrived();
    encounter.start(new Date('2026-03-02T10:00:00Z'));

    encounter.complete({ ...record, procedureCodes: ['10101012', ' 10101012 ', '40304361'] }, new Date());

    expect(encounter.status).toBe('COMPLETED');
    expect(encounter.toSnapshot().procedureCodes).toEqual(['10101012', '40304361']);
  });

  it('cannot be completed before it starts', () => {
    expect(() => arrived().complete(record, new Date())).toThrow(InvalidEncounterTransitionError);
  });

  it('requires at least one procedure code to complete', () => {
    const encounter = arrived();
    encounter.start(new Date());

    expect(() => encounter.complete({ ...record, procedureCodes: ['  '] }, new Date())).toThrow(
      ProcedureRequiredError,
    );
  });

  it('cannot be completed twice', () => {
    const encounter = arrived();
    encounter.start(new Date());
    encounter.complete(record, new Date());

    expect(() => encounter.complete(record, new Date())).toThrow(InvalidEncounterTransitionError);
  });
});
