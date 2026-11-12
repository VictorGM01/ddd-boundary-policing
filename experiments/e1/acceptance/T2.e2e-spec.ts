import { at, boot, completeEncounter, Ctx, encounterInvoice, plusMinutes, startedVisit, uid } from './support';

// The statement does not fix which medication codes billing prices, so a black-box test cannot check
// the amount of a priced prescription line. It checks the interface and the unpriced-code criterion.
describe('T2 · prescriptions generate billable items (acceptance)', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await boot();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const prescribe = (encounterId: string, medicationCode: string, quantity: number) =>
    ctx.http().post(`/clinical/encounters/${encounterId}/prescriptions`).send({ medicationCode, quantity });

  it('accepts a prescription during an encounter', async () => {
    const { encounterId } = await startedVisit(ctx, { personId: uid('t2-person'), practitionerId: uid('t2-dr'), startsAt: at('2030-02-10T10:00:00Z') });
    const res = await prescribe(encounterId, 'E1-MED-001', 2);
    expect(res.status).toBeLessThan(300);
  });

  it('a prescription without a price does not prevent the other invoice lines', async () => {
    const startsAt = at('2030-02-11T10:00:00Z');
    const { encounterId } = await startedVisit(ctx, { personId: uid('t2-person'), practitionerId: uid('t2-dr'), startsAt });
    expect((await prescribe(encounterId, 'E1-UNPRICED-XYZ', 1)).status).toBeLessThan(300);

    await completeEncounter(ctx, encounterId, plusMinutes(startsAt, 20), ['10101012', '40304361']);

    const invoice = await encounterInvoice(ctx, encounterId);
    const codes = invoice.lines.map((l) => l.code);
    expect(codes).toEqual(expect.arrayContaining(['10101012', '40304361']));
    expect(codes).not.toContain('E1-UNPRICED-XYZ');
  });
});
