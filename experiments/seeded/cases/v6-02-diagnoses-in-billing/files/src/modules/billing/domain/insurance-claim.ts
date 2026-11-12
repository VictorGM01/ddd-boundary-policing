export interface InsuranceClaim {
  payerId: string;
  encounterId: string;
  diagnosisCodes: string[];
  anamnesis: string;
  procedureCodes: string[];
}

export function claimSummary(claim: InsuranceClaim): string {
  return `${claim.diagnosisCodes.join(', ')}: ${claim.anamnesis.slice(0, 80)}`;
}
