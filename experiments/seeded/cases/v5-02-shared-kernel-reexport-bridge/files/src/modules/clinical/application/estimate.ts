import { PriceList } from '@/shared-kernel/pricing';

export function estimate(codes: string[]): number {
  return new PriceList().linesFor(codes).reduce((sum, line) => sum + line.amountCents, 0);
}
