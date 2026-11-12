import { randomUUID } from 'node:crypto';

export type PersonId = string;
export type PractitionerId = string;

export function newId(): string {
  return randomUUID();
}
