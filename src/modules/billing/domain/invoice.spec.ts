import { Invoice } from './invoice';
import { EmptyInvoiceError, InvalidLineAmountError, UnknownProcedureError } from './invoice.errors';
import { PriceList } from './price-list';

const base = {
  id: 'inv-1',
  payerId: 'person-1',
  source: { type: 'ENCOUNTER' as const, id: 'e-1' },
  issuedAt: new Date('2026-03-02T11:00:00Z'),
};

describe('Invoice', () => {
  it('totals its lines', () => {
    const invoice = Invoice.issue({
      ...base,
      lines: new PriceList().linesFor(['10101012', '40304361']),
    });

    expect(invoice.totalCents).toBe(28_500);
  });

  it('cannot be issued without lines', () => {
    expect(() => Invoice.issue({ ...base, lines: [] })).toThrow(EmptyInvoiceError);
  });

  it('rejects non-positive or fractional amounts', () => {
    expect(() => Invoice.issue({ ...base, lines: [{ code: 'X', description: 'x', amountCents: 0 }] })).toThrow(
      InvalidLineAmountError,
    );
    expect(() => Invoice.issue({ ...base, lines: [{ code: 'X', description: 'x', amountCents: 10.5 }] })).toThrow(
      InvalidLineAmountError,
    );
  });
});

describe('PriceList', () => {
  it('refuses to price an unknown procedure', () => {
    expect(() => new PriceList().linesFor(['99999999'])).toThrow(UnknownProcedureError);
  });
});
