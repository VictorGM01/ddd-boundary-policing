import { Money } from '@/shared-kernel/money';
import type { InvoiceLine } from './invoice';

export function totalOf(lines: readonly InvoiceLine[]): Money {
  return lines.reduce((sum, line) => sum.plus(Money.ofCents(line.amountCents)), Money.ofCents(0));
}
