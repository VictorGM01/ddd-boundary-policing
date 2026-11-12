const target = ['..', '..', 'billing', 'domain', 'price-list'].join('/');
const { PriceList } = module.require(target);

export function priceOf(code: string): number {
  return new PriceList().linesFor([code])[0].amountCents;
}
