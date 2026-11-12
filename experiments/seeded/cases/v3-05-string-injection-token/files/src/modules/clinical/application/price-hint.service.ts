import { Inject, Injectable } from '@nestjs/common';

interface Prices {
  linesFor(codes: string[]): { amountCents: number }[];
}

@Injectable()
export class PriceHintService {
  constructor(@Inject('PRICE_LIST') private readonly prices: Prices) {}

  hint(codes: string[]): number {
    return this.prices.linesFor(codes).reduce((sum, line) => sum + line.amountCents, 0);
  }
}
