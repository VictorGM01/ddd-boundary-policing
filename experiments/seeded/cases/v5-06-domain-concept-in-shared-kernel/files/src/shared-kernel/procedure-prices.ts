export const PROCEDURE_PRICES_CENTS: Readonly<Record<string, number>> = {
  '10101012': 25_000,
  '40304361': 3_500,
  '40101010': 8_000,
};

export function priceOfProcedure(code: string): number | undefined {
  return PROCEDURE_PRICES_CENTS[code];
}
