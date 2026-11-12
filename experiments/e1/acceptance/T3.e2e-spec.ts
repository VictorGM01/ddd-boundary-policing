import { at, boot, Ctx, entryFor, noShow, numbersIn, schedule, uid } from './support';

describe('T3 · no-show report (acceptance)', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await boot();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const report = (from: string, to: string) => ctx.http().get('/reports/no-shows').query({ from, to });

  it('counts no-shows and no-show fees per practitioner in the period', async () => {
    const drA = uid('t3-dra');
    const drB = uid('t3-drb');
    await noShow(ctx, { personId: uid('t3-p'), practitionerId: drA, startsAt: at('2031-03-10T10:00:00Z') });
    await noShow(ctx, { personId: uid('t3-p'), practitionerId: drA, startsAt: at('2031-03-12T10:00:00Z') });
    await noShow(ctx, { personId: uid('t3-p'), practitionerId: drB, startsAt: at('2031-03-14T10:00:00Z') });
    await noShow(ctx, { personId: uid('t3-p'), practitionerId: drA, startsAt: at('2031-04-20T10:00:00Z') });
    const cancelled = await schedule(ctx, { personId: uid('t3-p'), practitionerId: drA, startsAt: at('2031-03-16T10:00:00Z') });
    await ctx.http().post(`/scheduling/appointments/${cancelled}/cancel`).send({ reason: 'sick' });

    const res = await report('2031-03-01', '2031-03-31');
    expect(res.status).toBe(200);

    const a = numbersIn(entryFor(res.body, drA));
    const b = numbersIn(entryFor(res.body, drB));
    expect(a).toContain(2);
    expect(a.some((n) => n === 20_000 || n === 200)).toBe(true);
    expect(b).toContain(1);
    expect(b.some((n) => n === 10_000 || n === 100)).toBe(true);
  });

  it('answers when there are no invoices in the period', async () => {
    const res = await report('2031-07-01', '2031-07-31');
    expect(res.status).toBe(200);
    expect(numbersIn(res.body).every((n) => n === 0)).toBe(true);
  });
});
