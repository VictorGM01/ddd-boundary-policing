import { Encounter } from '../../clinical/domain/encounter';
import type { InvoiceLine } from './invoice';
import { PriceList } from './price-list';

export function linesForEncounter(encounter: Encounter, prices: PriceList): InvoiceLine[] {
  return prices.linesFor(encounter.toSnapshot().procedureCodes);
}
