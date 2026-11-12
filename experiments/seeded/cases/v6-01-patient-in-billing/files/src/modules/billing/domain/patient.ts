export class Patient {
  constructor(
    readonly personId: string,
    readonly allergies: string[],
    readonly chronicConditions: string[],
  ) {}

  isHighRisk(): boolean {
    return this.chronicConditions.length > 1;
  }
}
