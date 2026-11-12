import type { InsuranceAgreement } from './contracts/insurance-agreement';

export function isCovered(agreement: InsuranceAgreement, procedureCode: string): boolean {
  return agreement.coveredProcedureCodes.includes(procedureCode);
}
