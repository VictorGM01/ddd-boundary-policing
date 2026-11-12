import type { InvoiceLine } from './invoice';
import { Patient } from './patient';

export function riskSurcharge(patient: Patient): InvoiceLine[] {
  return patient.isHighRisk() ? [{ code: 'RISK', description: 'High-risk patient surcharge', amountCents: 5_000 }] : [];
}
