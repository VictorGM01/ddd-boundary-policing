import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { Clock, FixedClock } from '@/shared-kernel';
import { ACCEPTANCE_DATABASE_URL } from './global-setup';

// Black-box helpers: only the public HTTP interface of the baseline and of the task statement.
export interface Ctx {
  app: INestApplication<App>;
  clock: FixedClock;
  http: () => ReturnType<typeof request>;
}

export async function boot(): Promise<Ctx> {
  process.env.DATABASE_URL = ACCEPTANCE_DATABASE_URL;
  const clock = new FixedClock(new Date('2030-01-01T08:00:00Z'));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(Clock).useValue(clock).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  await app.init();
  return { app, clock, http: () => request(app.getHttpServer()) };
}

let seq = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

export const at = (iso: string) => new Date(iso);
export const plusMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);
export const plusDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

export async function schedule(ctx: Ctx, input: { personId: string; practitionerId: string; startsAt: Date }) {
  ctx.clock.set(plusMinutes(input.startsAt, -120));
  const res = await ctx
    .http()
    .post('/scheduling/appointments')
    .send({ practitionerId: input.practitionerId, startsAt: input.startsAt.toISOString(), requester: { personId: input.personId, name: 'Ana Souza', phone: '11999990000' } });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

export async function noShow(ctx: Ctx, input: { personId: string; practitionerId: string; startsAt: Date }) {
  const appointmentId = await schedule(ctx, input);
  ctx.clock.set(plusMinutes(input.startsAt, 20));
  const res = await ctx.http().post(`/scheduling/appointments/${appointmentId}/no-show`);
  expect(res.status).toBe(200);
  return appointmentId;
}

export async function checkIn(ctx: Ctx, appointmentId: string, when: Date) {
  ctx.clock.set(when);
  return ctx.http().post(`/front-desk/visits/${appointmentId}/check-in`);
}

export async function encounterFor(ctx: Ctx, appointmentId: string) {
  const res = await ctx.http().get('/clinical/encounters').query({ appointmentId });
  expect(res.status).toBe(200);
  return res.body.id as string;
}

export async function startEncounter(ctx: Ctx, encounterId: string, when: Date) {
  ctx.clock.set(when);
  const res = await ctx.http().post(`/clinical/encounters/${encounterId}/start`);
  expect(res.status).toBe(200);
}

export async function completeEncounter(ctx: Ctx, encounterId: string, when: Date, procedureCodes: string[]) {
  ctx.clock.set(when);
  const res = await ctx
    .http()
    .post(`/clinical/encounters/${encounterId}/complete`)
    .send({ notes: 'Routine check', diagnosisCodes: ['Z00.0'], procedureCodes });
  expect(res.status).toBe(200);
}

// Schedule → check-in → open encounter → start; returns the ids. The visit is at `startsAt`.
export async function startedVisit(ctx: Ctx, input: { personId: string; practitionerId: string; startsAt: Date }) {
  const appointmentId = await schedule(ctx, input);
  const checkInRes = await checkIn(ctx, appointmentId, plusMinutes(input.startsAt, -10));
  expect(checkInRes.status).toBe(200);
  const encounterId = await encounterFor(ctx, appointmentId);
  await startEncounter(ctx, encounterId, input.startsAt);
  return { appointmentId, encounterId };
}

export async function completedVisit(ctx: Ctx, input: { personId: string; practitionerId: string; startsAt: Date; procedureCodes: string[] }) {
  const ids = await startedVisit(ctx, input);
  await completeEncounter(ctx, ids.encounterId, plusMinutes(input.startsAt, 20), input.procedureCodes);
  return ids;
}

export interface InvoiceView {
  id: string;
  payerId: string;
  source: { type: string; id: string };
  status: string;
  lines: { code: string; description?: string; amountCents: number }[];
  totalCents: number;
}

export async function invoicesOf(ctx: Ctx, payerId: string): Promise<InvoiceView[]> {
  const res = await ctx.http().get('/billing/invoices').query({ payerId });
  expect(res.status).toBe(200);
  return res.body as InvoiceView[];
}

export async function encounterInvoice(ctx: Ctx, encounterId: string): Promise<InvoiceView> {
  const res = await ctx.http().get('/billing/invoices').query({ sourceType: 'ENCOUNTER', sourceId: encounterId });
  expect(res.status).toBe(200);
  return (res.body as InvoiceView[])[0];
}

export function numbersIn(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return [Number(value)];
  if (Array.isArray(value)) return value.flatMap(numbersIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(numbersIn);
  return [];
}

// Finds the part of a response that talks about `key` (an id used as value or as property name).
export function entryFor(body: unknown, key: string): unknown {
  if (Array.isArray(body)) {
    for (const item of body) {
      const found = entryFor(item, key);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (key in obj) return obj[key];
    if (Object.values(obj).some((v) => v === key)) return obj;
    for (const v of Object.values(obj)) {
      const found = entryFor(v, key);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export const approxIn = (nums: number[], expected: number, relTol = 0.025) =>
  nums.some((n) => Math.abs(n - expected) <= Math.max(Math.abs(expected) * relTol, 1e-9));
