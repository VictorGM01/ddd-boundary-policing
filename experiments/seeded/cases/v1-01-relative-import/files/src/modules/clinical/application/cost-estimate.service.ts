import { Injectable } from '@nestjs/common';
import { PriceList } from '../../billing/domain/price-list';

@Injectable()
export class CostEstimateService {
  private readonly prices = new PriceList();

  estimate(procedureCodes: string[]): number {
    return this.prices.linesFor(procedureCodes).reduce((sum, line) => sum + line.amountCents, 0);
  }
}
