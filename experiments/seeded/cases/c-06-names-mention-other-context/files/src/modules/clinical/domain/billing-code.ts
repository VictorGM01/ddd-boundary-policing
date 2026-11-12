export class BillingCode {
  static format(procedureCode: string): string {
    return procedureCode.replace(/^(\d{2})(\d{2})(\d{4})$/, '$1.$2.$3');
  }
}
