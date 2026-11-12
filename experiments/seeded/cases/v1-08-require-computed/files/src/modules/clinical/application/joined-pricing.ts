import { join } from 'node:path';

const { PriceList } = require(join('..', '..', 'billing', 'domain', 'price-list'));

export function priceOf(code: string): number {
  return new PriceList().linesFor([code])[0].amountCents;
}
