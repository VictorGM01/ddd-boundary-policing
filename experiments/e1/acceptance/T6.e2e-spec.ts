import { approxIn, at, boot, checkIn, Ctx, encounterFor, numbersIn, plusMinutes, schedule, startEncounter, uid } from './support';

// The statement fixes neither field names nor unit, so the check accepts milliseconds, seconds or
// minutes (the same unit for both values) and an average over served visitors or over everyone.
describe('T6 · waiting time in the queue (acceptance)', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await boot();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const metrics = async (now: Date) => {
    ctx.clock.set(now);
    const res = await ctx.http().get('/front-desk/queue/metrics');
    expect(res.status).toBe(200);
    return numbersIn(res.body);
  };

  const matches = (nums: number[], averages: number[], maximum: number) =>
    [60_000, 60, 1].some((unit) => approxIn(nums, maximum * unit) && averages.some((avg) => approxIn(nums, avg * unit)));

  async function arrive(day: string, checkInAt: string) {
    const startsAt = at(`${day}T13:30:00Z`);
    const appointmentId = await schedule(ctx, { personId: uid('t6-person'), practitionerId: uid('t6-dr'), startsAt });
    const res = await checkIn(ctx, appointmentId, at(`${day}T${checkInAt}:00Z`));
    expect(res.status).toBe(200);
    return encounterFor(ctx, appointmentId);
  }

  it('reports average and maximum waiting time today, counting who is still waiting in the maximum', async () => {
    const day = '2034-06-12';
    const e1 = await arrive(day, '12:00');
    const e2 = await arrive(day, '12:10');
    await arrive(day, '12:20');
    await startEncounter(ctx, e1, at(`${day}T12:20:00Z`));
    await startEncounter(ctx, e2, at(`${day}T12:50:00Z`));

    const nums = await metrics(at(`${day}T13:10:00Z`));
    expect(matches(nums, [30, 110 / 3], 50)).toBe(true);
  });

  it('updates when an encounter starts', async () => {
    const day = '2034-06-13';
    const encounterId = await arrive(day, '12:00');
    expect(matches(await metrics(at(`${day}T12:30:00Z`)), [30, 0], 30)).toBe(true);

    await startEncounter(ctx, encounterId, at(`${day}T12:30:00Z`));
    const later = await metrics(plusMinutes(at(`${day}T12:30:00Z`), 30));
    expect(matches(later, [30], 30)).toBe(true);
    expect(approxIn(later, 60) || approxIn(later, 3600) || approxIn(later, 3_600_000)).toBe(false);
  });
});
