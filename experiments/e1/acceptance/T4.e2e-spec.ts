import { at, boot, checkIn, Ctx, noShow, plusDays, plusMinutes, schedule, uid } from './support';

// "Paid" cannot be exercised: the statement defines no payment interface.
describe('T4 · block check-in for overdue invoices (acceptance)', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await boot();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const day0 = at('2032-01-10T10:00:00Z');

  async function checkInAfter(personId: string, days: number) {
    const startsAt = plusMinutes(plusDays(day0, days), 60);
    const appointmentId = await schedule(ctx, { personId, practitionerId: uid('t4-dr'), startsAt });
    return checkIn(ctx, appointmentId, plusMinutes(startsAt, -10));
  }

  it('refuses the check-in with an open invoice older than 30 days', async () => {
    const personId = uid('t4-person');
    await noShow(ctx, { personId, practitionerId: uid('t4-dr'), startsAt: day0 });

    const res = await checkInAfter(personId, 31);
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('OverdueBalanceError');
  });

  it('accepts the check-in when the open invoice is recent', async () => {
    const personId = uid('t4-person');
    await noShow(ctx, { personId, practitionerId: uid('t4-dr'), startsAt: plusMinutes(day0, 120) });

    const res = await checkInAfter(personId, 10);
    expect(res.status).toBe(200);
  });

  it('does not block visitors without invoices', async () => {
    const res = await checkInAfter(uid('t4-person'), 31);
    expect(res.status).toBe(200);
  });
});
