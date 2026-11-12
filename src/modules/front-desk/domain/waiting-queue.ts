import type { Visit } from './visit';

export class WaitingQueue {
  private constructor(private readonly visits: readonly Visit[]) {}

  static of(visits: readonly Visit[]): WaitingQueue {
    const waiting = visits
      .filter((visit) => visit.status === 'CHECKED_IN' && visit.checkedInAt !== null)
      .sort((a, b) => (a.checkedInAt as Date).getTime() - (b.checkedInAt as Date).getTime());
    return new WaitingQueue(waiting);
  }

  get size(): number {
    return this.visits.length;
  }

  positionOf(visitId: string): number | null {
    const index = this.visits.findIndex((visit) => visit.id === visitId);
    return index === -1 ? null : index + 1;
  }

  entries(): readonly Visit[] {
    return this.visits;
  }
}
