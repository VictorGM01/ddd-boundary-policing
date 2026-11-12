import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Clock, FixedClock } from '@/shared-kernel';
import { E2E_DATABASE_URL } from './global-setup';

describe('Clinic flow across the four bounded contexts (e2e)', () => {
  let app: INestApplication<App>;
  const clock = new FixedClock(new Date('2026-03-02T08:00:00Z'));

  beforeAll(async () => {
    process.env.DATABASE_URL = E2E_DATABASE_URL;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Clock)
      .useValue(clock)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    clock.set(new Date('2026-03-02T08:00:00Z'));
    const prisma = app.get(PrismaService);
    await prisma.billingInvoice.deleteMany();
    await prisma.clinicalEncounter.deleteMany();
    await prisma.frontDeskVisit.deleteMany();
    await prisma.schedulingAppointment.deleteMany();
  });

  const http = () => request(app.getHttpServer());

  async function scheduleAppointment(personId: string, startsAt = '2026-03-02T10:00:00.000Z') {
    const response = await http()
      .post('/scheduling/appointments')
      .send({ practitionerId: 'dr-house', startsAt, requester: { personId, name: 'Ana Souza', phone: '11999990000' } })
      .expect(201);
    return response.body.id as string;
  }

  it('schedule → check-in → complete encounter → invoice issued, only through events', async () => {
    const appointmentId = await scheduleAppointment('person-42');

    clock.set(new Date('2026-03-02T09:50:00Z'));
    const checkIn = await http().post(`/front-desk/visits/${appointmentId}/check-in`).expect(200);
    expect(checkIn.body).toMatchObject({ status: 'CHECKED_IN', queuePosition: 1 });

    const waiting = await http().get('/clinical/encounters').query({ appointmentId }).expect(200);
    expect(waiting.body).toMatchObject({ status: 'WAITING', patientId: 'person-42' });
    const encounterId = waiting.body.id as string;

    clock.set(new Date('2026-03-02T10:05:00Z'));
    await http().post(`/clinical/encounters/${encounterId}/start`).expect(200);
    clock.set(new Date('2026-03-02T10:25:00Z'));
    await http()
      .post(`/clinical/encounters/${encounterId}/complete`)
      .send({ notes: 'Routine check', diagnosisCodes: ['Z00.0'], procedureCodes: ['10101012', '40304361'] })
      .expect(200);

    const invoices = await http()
      .get('/billing/invoices')
      .query({ sourceType: 'ENCOUNTER', sourceId: encounterId })
      .expect(200);
    expect(invoices.body).toEqual([
      expect.objectContaining({
        payerId: 'person-42',
        totalCents: 28_500,
        lines: [
          expect.objectContaining({ code: '10101012' }),
          expect.objectContaining({ code: '40304361' }),
        ],
      }),
    ]);
    expect(JSON.stringify(invoices.body)).not.toContain('Z00.0');
  });

  it('cancelling an appointment prevents the check-in at the front desk', async () => {
    const appointmentId = await scheduleAppointment('person-7');

    await http().post(`/scheduling/appointments/${appointmentId}/cancel`).send({ reason: 'sick' }).expect(200);

    const response = await http().post(`/front-desk/visits/${appointmentId}/check-in`).expect(422);
    expect(response.body.error).toBe('CheckInNotAllowedError');
  });

  it('a no-show in scheduling becomes a no-show fee invoice in billing', async () => {
    const appointmentId = await scheduleAppointment('person-9');

    clock.set(new Date('2026-03-02T10:20:00Z'));
    await http().post(`/scheduling/appointments/${appointmentId}/no-show`).expect(200);

    const invoices = await http().get('/billing/invoices').query({ payerId: 'person-9' }).expect(200);
    expect(invoices.body).toEqual([
      expect.objectContaining({ source: { type: 'NO_SHOW', id: appointmentId }, totalCents: 10_000 }),
    ]);
  });

  it('rejects double booking of the same practitioner slot', async () => {
    await scheduleAppointment('person-1');

    const response = await http()
      .post('/scheduling/appointments')
      .send({
        practitionerId: 'dr-house',
        startsAt: '2026-03-02T10:15:00.000Z',
        requester: { personId: 'person-2', name: 'Bruno' },
      })
      .expect(422);
    expect(response.body.error).toBe('SlotUnavailableError');
  });
});
