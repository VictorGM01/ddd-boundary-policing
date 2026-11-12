export class TimeSlot {
  private constructor(readonly startsAt: Date, readonly endsAt: Date) {}

  static of(startsAt: Date, minutes: number): TimeSlot {
    return new TimeSlot(startsAt, new Date(startsAt.getTime() + minutes * 60_000));
  }

  overlaps(other: TimeSlot): boolean {
    return this.startsAt < other.endsAt && other.startsAt < this.endsAt;
  }
}
