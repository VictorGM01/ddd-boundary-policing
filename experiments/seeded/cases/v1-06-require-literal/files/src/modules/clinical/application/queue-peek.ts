const { WaitingQueue } = require('../../front-desk/domain/waiting-queue');

export function emptyQueueSize(): number {
  return WaitingQueue.of([]).size;
}
