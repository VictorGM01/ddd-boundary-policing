interface Invoicer {
  invoiceEncounter(input: { encounterId: string; payerId: string; procedureCodes: string[] }): Promise<unknown>;
}

export async function billNow(encounterId: string, payerId: string, procedureCodes: string[]): Promise<void> {
  const invoicer = (globalThis as Record<string, unknown>).__clinicInvoicing as Invoicer;
  await invoicer.invoiceEncounter({ encounterId, payerId, procedureCodes });
}
