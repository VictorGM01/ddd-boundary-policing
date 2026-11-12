import type { BillingFacade } from '@/common/billing-facade';

export async function billThroughFacade(facade: BillingFacade, encounterId: string, payerId: string): Promise<void> {
  await facade.bill(encounterId, payerId, ['10101012']);
}
