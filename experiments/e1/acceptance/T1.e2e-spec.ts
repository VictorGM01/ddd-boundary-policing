import { at, boot, Ctx, invoicesOf, noShow, schedule, uid } from './support';

describe('T1 · cancel an appointment and refund its no-show fee (acceptance)', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await boot();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const cancelByClinic = (appointmentId: string) =>
    ctx.http().post(`/scheduling/appointments/${appointmentId}/cancel`).send({ reason: 'clinic', refund: true });

  it('refunds the no-show invoice when the clinic cancels with refund', async () => {
    const personId = uid('t1-person');
    const appointmentId = await noShow(ctx, { personId, practitionerId: uid('t1-dr'), startsAt: at('2030-01-15T10:00:00Z') });
    const before = (await invoicesOf(ctx, personId)).find((i) => i.source.type === 'NO_SHOW' && i.source.id === appointmentId);
    expect(before?.status).toBe('OPEN');

    const res = await cancelByClinic(appointmentId);
    expect(res.status).toBeLessThan(300);

    const after = (await invoicesOf(ctx, personId)).find((i) => i.source.type === 'NO_SHOW' && i.source.id === appointmentId);
    expect(after?.status).toBe('REFUNDED');
  });

  it('cancelling an appointment without an invoice does not fail', async () => {
    const appointmentId = await schedule(ctx, { personId: uid('t1-person'), practitionerId: uid('t1-dr'), startsAt: at('2030-01-16T10:00:00Z') });
    const res = await cancelByClinic(appointmentId);
    expect(res.status).toBeLessThan(300);
  });

  it('refunds only once when the cancellation is repeated', async () => {
    const personId = uid('t1-person');
    const appointmentId = await noShow(ctx, { personId, practitionerId: uid('t1-dr'), startsAt: at('2030-01-17T10:00:00Z') });

    expect((await cancelByClinic(appointmentId)).status).toBeLessThan(300);
    await cancelByClinic(appointmentId);

    const invoices = await invoicesOf(ctx, personId);
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({ source: { type: 'NO_SHOW', id: appointmentId }, status: 'REFUNDED' });
  });
});
