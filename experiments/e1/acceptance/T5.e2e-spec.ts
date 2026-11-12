import { at, boot, completedVisit, Ctx, encounterInvoice, plusDays, uid } from './support';

describe('T5 · free follow-up within 30 days (acceptance)', () => {
  let ctx: Ctx;
  beforeAll(async () => {
    ctx = await boot();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const day0 = at('2033-02-01T09:00:00Z');
  const codes = ['10101012', '40304361'];

  async function invoicedCodes(personId: string, practitionerId: string, startsAt: Date) {
    const { encounterId } = await completedVisit(ctx, { personId, practitionerId, startsAt, procedureCodes: codes });
    return (await encounterInvoice(ctx, encounterId)).lines.map((l) => l.code);
  }

  it('does not charge the consultation again within 30 days with the same practitioner', async () => {
    const personId = uid('t5-person');
    const dr = uid('t5-dr');
    expect(await invoicedCodes(personId, dr, day0)).toContain('10101012');

    const followUp = await invoicedCodes(personId, dr, plusDays(day0, 10));
    expect(followUp).not.toContain('10101012');
    expect(followUp).toContain('40304361');
  });

  it('charges normally after 30 days', async () => {
    const personId = uid('t5-person');
    const dr = uid('t5-dr');
    await invoicedCodes(personId, dr, day0);

    expect(await invoicedCodes(personId, dr, plusDays(day0, 31))).toContain('10101012');
  });

  it('charges normally with another practitioner', async () => {
    const personId = uid('t5-person');
    await invoicedCodes(personId, uid('t5-dr'), day0);

    expect(await invoicedCodes(personId, uid('t5-dr'), plusDays(day0, 10))).toContain('10101012');
  });
});
