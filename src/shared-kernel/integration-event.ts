import { newId } from './ids';

export interface IntegrationEvent {
  eventId: string;
  occurredAt: string;
}

export function eventEnvelope(occurredAt: Date): IntegrationEvent {
  return { eventId: newId(), occurredAt: occurredAt.toISOString() };
}
