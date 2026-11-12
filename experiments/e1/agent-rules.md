# Architecture rules for this codebase

This is a NestJS modular monolith with four bounded contexts in `src/modules/`: `scheduling`, `front-desk`, `clinical`, `billing`. Follow these rules in every change. `npm run check:arch` must pass before you finish.

## Context map

- `scheduling` → `front-desk`: AppointmentScheduled, AppointmentCancelled
- `front-desk` → `clinical`: VisitorCheckedIn
- `clinical` → `billing`: EncounterCompleted
- `scheduling` → `billing`: AppointmentNoShow

Arrows point from upstream (publisher) to downstream (consumer). No other relation exists. If a feature needs one, add it to `context-map.json` and say so explicitly in your summary.

## Rules

1. **R1** Never import anything from another context's folder. That includes types, barrels, `require` and `import()`.
2. **R2** A context may import only its own contract file in `src/contracts/` and those of its upstream contexts listed above.
3. **R3** `src/shared-kernel/` holds primitives only (ids, `IntegrationEvent`, `Clock`, `DomainError`). It imports nothing from contexts, contracts or infrastructure.
4. **R4** Files in `src/contracts/` import only from the shared kernel. Contracts are minimal serializable payloads: no classes with behaviour, no internal models, no data the consumer does not need.
5. **R5** Only `src/app.module.ts` imports context modules. Do not create shared folders (`common/`, `utils/`…) that import contexts.
6. **R6** Only `src/modules/<ctx>/infrastructure/` uses `PrismaService` or `@prisma/client`.
7. **R7** A context touches only the Prisma models with its own prefix (`Scheduling*`, `FrontDesk*`, `Clinical*`, `Billing*`). No raw SQL against another context's tables.
8. **R8** Do not use `ModuleRef`.
9. **R9** Context modules do not `export` providers, and contexts never call each other synchronously.
10. **R10** Cross-context communication is only by publishing an event with `EventEmitter2.emitAsync` and handling it with `@OnEvent`. Event names come from the constants in `src/contracts/`. Never read a listener's return value.
11. **R11** Injection tokens are classes or symbols, never strings.
12. **R12** No dependency cycles.
13. **R13** `require`/`import()` only with literal paths.

## Ubiquitous language

Contexts share only the identifier `personId`, never a Person model. The person is a **Requester** in scheduling, a **Visitor** in front-desk, a **Patient** in clinical and a **Payer** in billing. Do not model another context's role or concepts (for example, no `Patient` or diagnoses in billing, no triage in front-desk). If a context needs data owned by another, the owner must publish it in an event and the consumer keeps its own copy in its own model.
