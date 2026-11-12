export class Money {
  private constructor(readonly cents: number) {}

  static ofCents(cents: number): Money {
    if (!Number.isInteger(cents)) throw new Error('Money must be integer cents');
    return new Money(cents);
  }

  plus(other: Money): Money {
    return new Money(this.cents + other.cents);
  }
}
