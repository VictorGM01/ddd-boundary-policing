import type { InvoiceLine } from './invoice';
import { UnknownProcedureError } from './invoice.errors';

interface PriceEntry {
  description: string;
  amountCents: number;
}

export const NO_SHOW_FEE_CODE = 'NO-SHOW';

const DEFAULT_PRICES: Record<string, PriceEntry> = {
  '10101012': { description: 'Office consultation', amountCents: 25_000 },
  '40304361': { description: 'Complete blood count', amountCents: 3_500 },
  '40101010': { description: 'Electrocardiogram', amountCents: 8_000 },
  [NO_SHOW_FEE_CODE]: { description: 'No-show fee', amountCents: 10_000 },
};

export class PriceList {
  constructor(private readonly prices: Readonly<Record<string, PriceEntry>> = DEFAULT_PRICES) {}

  linesFor(codes: readonly string[]): InvoiceLine[] {
    return codes.map((code) => {
      const entry = this.prices[code];
      if (!entry) {
        throw new UnknownProcedureError(code);
      }
      return { code, ...entry };
    });
  }

  noShowFee(): InvoiceLine {
    return this.linesFor([NO_SHOW_FEE_CODE])[0];
  }
}
