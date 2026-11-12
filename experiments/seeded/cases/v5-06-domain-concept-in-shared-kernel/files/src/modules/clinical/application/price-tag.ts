import { priceOfProcedure } from '@/shared-kernel/procedure-prices';

export function priceTag(code: string): string {
  const cents = priceOfProcedure(code);
  return cents === undefined ? 'n/a' : `R$ ${(cents / 100).toFixed(2)}`;
}
