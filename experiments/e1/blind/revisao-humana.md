# Revisão humana da rotulagem cega

Amostra determinística (um a cada k diffs, em ordem de id) dos diffs rotulados pelos subagentes. Para cada um, abra o `.patch`, confira as violações rotuladas e anote se concorda, se falta alguma ou se alguma não é violação. O mapeamento para braço e tarefa está em `../blind-mapping.json`; abra-o só depois de revisar, para não enviesar a revisão. Os rotuladores não viram `context-map.json`: um rótulo `V1.b-new-relation` só vira violação se a execução não declarou a relação no mapa (ADR-024).

## d-0723d7 · [d-0723d7.patch](d-0723d7.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-0723d7","d-0723d7-v1","V1","V1.b-new-relation:front-desk->clinical","src/modules/front-desk/api/clinical-events.listener.ts","@OnEvent(ClinicalEvents.EncounterStarted)","Front-desk imports the clinical contract and listens to a clinical event, but clinical is downstream (not upstream) of front-desk in the map, a relation outside the map (taxonomy V1.b) that also creates a cycle."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-29c209 · [d-29c209.patch](d-29c209.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-29c209","d-29c209-v1","V1","V1.b-new-relation:front-desk->clinical","src/modules/front-desk/api/clinical-events.listener.ts","@OnEvent(ClinicalEvents.EncounterStarted)","Front-desk imports the clinical contract and listens to a clinical event, but clinical is downstream (not upstream) of front-desk in the map, a relation outside the map (taxonomy V1.b) that also creates a cycle."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-34cf3e · [d-34cf3e.patch](d-34cf3e.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-34cf3e","d-34cf3e-none","NONE","","","","no violation found"
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-421cf6 · [d-421cf6.patch](d-421cf6.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-421cf6","d-421cf6-none","NONE","","","","no violation found"
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-501ef5 · [d-501ef5.patch](d-501ef5.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-501ef5","d-501ef5-v1","V1","V1.b-new-relation:reporting->scheduling","src/modules/reporting/api/events.listener.ts","import { AppointmentNoShow, SchedulingEvents } from '@/contracts/scheduling.events';","V1.b: the new reporting context imports and listens to the scheduling Published Language, a relation absent from the context map."
"d-501ef5","d-501ef5-v2","V1","V1.b-new-relation:reporting->billing","src/modules/reporting/api/events.listener.ts","@OnEvent(BillingEvents.NoShowFeeCharged)","V1.b: reporting depends on a new billing contract/event, but the map states billing has no downstream, so this relation is not in the map."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-6371b1 · [d-6371b1.patch](d-6371b1.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-6371b1","d-6371b1-none","NONE","","","","no violation found"
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-8151c2 · [d-8151c2.patch](d-8151c2.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-8151c2","d-8151c2-v1","V1","V1.b-new-relation:front-desk->clinical","src/modules/front-desk/api/clinical-events.listener.ts","@OnEvent(ClinicalEvents.EncounterStarted)","Front-desk listens to a clinical event and imports clinical.events, but clinical is downstream (not upstream) of front-desk in the map, creating an unmapped relation and a cycle (V1.b)."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-976c6c · [d-976c6c.patch](d-976c6c.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-976c6c","d-976c6c-none","NONE","","","","no violation found"
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-c9da04 · [d-c9da04.patch](d-c9da04.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-c9da04","d-c9da04-v1","V6","V6-refund-in-scheduling","src/contracts/scheduling.events.ts","AppointmentRefundRequested: 'scheduling.appointment-refund-requested',","Scheduling now publishes a refund request and enforces a refund rule (RefundRequiresClinicCancellationError), modelling billing's refund concept in scheduling's language (V6); judged borderline but billing terms are clearly in scheduling."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-d983ed · [d-d983ed.patch](d-d983ed.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-d983ed","d-d983ed-none","NONE","","","","no violation found"
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

# Amostra complementar: diffs com rótulos V3 ou V6

A amostra acima, um a cada k ids, não pegou nenhum diff com V3 e só um com V6. Aqui entram todos os outros diffs rotulados com essas categorias, escolhidos só pelo rótulo, sem olhar braço ou tarefa.

## d-2d3a7a · [d-2d3a7a.patch](d-2d3a7a.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-2d3a7a","d-2d3a7a-v1","V1","V1.b-new-relation:front-desk->billing","src/modules/front-desk/api/billing-events.listener.ts","@OnEvent(BillingEvents.InvoiceIssued)","Front-desk imports a new billing contract and listens to a billing event, but billing has no downstream in the map and is not upstream of front-desk (taxonomy V1.b)."
"d-2d3a7a","d-2d3a7a-v2","V6","V6-billing-concept-in-front-desk","src/modules/front-desk/domain/visitor-balance.ts","return this.openInvoices.some((invoice) => invoice.issuedAt.getTime() < cutoff);","Front-desk domain now models billing's Invoice (OpenInvoice) and reimplements a billing rule (an invoice is overdue 30 days after issue), using billing's term and rules inside front-desk (taxonomy V6); judged a violation because it is a domain model/rule, not just a field name."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-2f107a · [d-2f107a.patch](d-2f107a.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-2f107a","d-2f107a-v1","V1","V1.b-new-relation:front-desk->billing","src/modules/front-desk/api/billing-events.listener.ts","@OnEvent(BillingEvents.InvoiceIssued)","Front-desk imports a new billing contract and listens to a billing event, but billing has no downstream in the map and is not upstream of front-desk (taxonomy V1.b)."
"d-2f107a","d-2f107a-v2","V6","V6-billing-concept-in-front-desk","src/modules/front-desk/domain/open-invoice.ts","export class OpenInvoice { ... isOverdueAt(now: Date): boolean {","Front-desk domain now has an OpenInvoice entity with an overdue rule (30 days after issue), modelling billing's Invoice concept and rule inside front-desk (taxonomy V6); judged a violation because it is a domain model/rule, not just a field name."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-3bd1b0 · [d-3bd1b0.patch](d-3bd1b0.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-3bd1b0","d-3bd1b0-v1","V1","V1.b-new-relation:front-desk->billing","src/modules/front-desk/api/billing-events.listener.ts","@OnEvent(BillingEvents.InvoiceIssued)","Front-desk imports a new billing contract and listens to a billing event, but billing has no downstream in the map and is not upstream of front-desk (taxonomy V1.b)."
"d-3bd1b0","d-3bd1b0-v2","V6","V6-billing-concept-in-front-desk","src/modules/front-desk/domain/overdue-balance.ts","export function overdueCutoff(now: Date): Date {","Front-desk tracks billing's invoices (VisitorInvoiceRecord) and reimplements a billing rule (an invoice is overdue 30 days after issue) inside front-desk (taxonomy V6); judged a violation because it is a domain rule, not just a field name."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-4eb547 · [d-4eb547.patch](d-4eb547.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-4eb547","d-4eb547-v1","V1","V1.b-new-relation:front-desk->billing","src/modules/front-desk/api/billing-events.listener.ts","@OnEvent(BillingEvents.InvoiceIssued)","V1.b: front-desk listens to a new billing event, but billing is not upstream of front-desk in the map (billing has no downstream; it also closes a cycle front-desk->clinical->billing->front-desk)."
"d-4eb547","d-4eb547-v2","V6","V6-invoice-term-in-front-desk","src/modules/front-desk/domain/open-invoice.repository.ts","export abstract class OpenInvoiceRepository { ... hasIssuedBefore(personId, cutoff)","V6: front-desk models billing's concept Invoice (Fatura) with billing's term and an overdue-invoice rule, instead of its own vocabulary; borderline as it is a local projection, but the term and rule belong to billing."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-5ba3e6 · [d-5ba3e6.patch](d-5ba3e6.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-5ba3e6","d-5ba3e6-v1","V1","V1.b-new-relation:front-desk->billing","src/modules/front-desk/application/visits.service.ts","import { OverdueBalanceQuery } from '@/contracts/billing.queries';","V1.b: front-desk depends on a new billing published contract, but billing is not upstream of front-desk in the map."
"d-5ba3e6","d-5ba3e6-v2","V1","V1-module-import","src/modules/front-desk/front-desk.module.ts","import { BillingModule } from '../billing/billing.module';","V1: front-desk code directly imports an artifact (the Nest module) of the billing context."
"d-5ba3e6","d-5ba3e6-v3","V3","V3-sync-query","src/modules/front-desk/application/visits.service.ts","if (await this.overdueBalance.hasOverdueBalance(visit.toSnapshot().personId)) {","V3: front-desk synchronously calls a billing provider (InvoicingService injected via imports: [BillingModule]) in request/response style instead of using events."
"d-5ba3e6","d-5ba3e6-v4","V3","V3-module-exports","src/modules/billing/billing.module.ts","exports: [OverdueBalanceQuery],","V3: a context module exports a provider for consumption by another context, a listed V3 variant."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-7d5773 · [d-7d5773.patch](d-7d5773.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-7d5773","d-7d5773-v1","V1","V1.b-new-relation:front-desk->billing","src/modules/front-desk/application/visits.service.ts","import { OverdueBalanceQuery } from '@/contracts/billing.queries';","Front-desk now depends on a billing published contract although billing is not upstream of front-desk in the map (V1.b); the front-desk spec repeats the same import."
"d-7d5773","d-7d5773-v2","V3","V3-sync-query-injection","src/modules/front-desk/application/visits.service.ts","if (await this.overdueBalance.hasOverdueBalance(visit.toSnapshot().personId)) {","Front-desk injects a billing-implemented provider and waits on a request/response call during check-in, a synchronous call between contexts (V3)."
"d-7d5773","d-7d5773-v3","V3","V3-global-module-exports","src/modules/billing/billing.module.ts","@Global() ... { provide: OverdueBalanceQuery, useExisting: InvoicingService } ... exports: [OverdueBalanceQuery]","Billing module is made @Global and exports a provider so other contexts can inject it, the exports-between-context-modules variant of V3."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-9732c1 · [d-9732c1.patch](d-9732c1.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-9732c1","d-9732c1-v1","V6","V6-refund-in-scheduling","src/contracts/scheduling.events.ts","/** The clinic cancelled and the person must get back what was charged... */ refund: boolean;","Scheduling's published language and cancel logic now model a refund (a billing concept and decision about charges) instead of just stating the cancellation fact, a ubiquitous-language leak (V6); judged borderline but billing terms are clearly in scheduling."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-e5c93c · [d-e5c93c.patch](d-e5c93c.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-e5c93c","d-e5c93c-v1","V6","V6-billing-concept-in-scheduling","src/modules/scheduling/domain/appointment.ts","cancel(reason: string, refund = false): boolean { ... return clinicRefund; // whether the no-show fee must be refunded","Scheduling now models the Billing concept of refunding the no-show fee (NO_SHOW_FEE belongs to Faturamento) in its Appointment and in AppointmentCancelled.refundNoShowFee, a ubiquitous-language leak per V6; billing consuming AppointmentCancelled itself is fine since scheduling is upstream of billing (M4)."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-f6ea3f · [d-f6ea3f.patch](d-f6ea3f.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-f6ea3f","d-f6ea3f-v1","V1","V1.b-new-relation:front-desk->billing","src/modules/front-desk/application/visits.service.ts","import { OverdueBalanceQuery } from '@/contracts/billing.queries';","Front-desk depends on a new billing published contract although billing is not upstream of front-desk in the map (billing has no downstream), an unmapped relation (V1.b); the front-desk spec also imports it."
"d-f6ea3f","d-f6ea3f-v2","V3","V3-sync-query-injection","src/modules/front-desk/application/visits.service.ts","private readonly overdueBalances: OverdueBalanceQuery, ... await this.overdueBalances.hasOverdueBalance(","Front-desk synchronously calls a billing-provided service (request/response) during check-in instead of reacting to events, a synchronous inter-module call per V3."
"d-f6ea3f","d-f6ea3f-v3","V3","V3-module-exports-global","src/modules/billing/billing.module.ts","@Global() ... { provide: OverdueBalanceQuery, useExisting: InvoicingService } ... exports: [OverdueBalanceQuery]","The billing context module is made @Global and exports a provider backed by InvoicingService for other contexts to inject, the exports-from-context-module variant of V3."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 

## d-fb116a · [d-fb116a.patch](d-fb116a.patch)

```csv
blind_id,violation_id,category,subcategory,file,excerpt,justification
"d-fb116a","d-fb116a-v1","V1","V1.b-new-relation:front-desk->billing","src/modules/front-desk/api/billing-events.listener.ts","@OnEvent(BillingEvents.InvoiceIssued)","Front-desk imports a new billing contract and listens to InvoiceIssued, but billing is not upstream of front-desk in the map (billing has no downstream), an unmapped relation (V1.b)."
"d-fb116a","d-fb116a-v2","V6","V6-billing-rule-in-front-desk","src/modules/front-desk/domain/outstanding-balance.ts","export const OVERDUE_AFTER_DAYS = 30; ... isOverdue(now: Date): boolean","Front-desk models an outstanding balance and reimplements the billing rule of when an invoice is overdue, a Billing concept/rule leaking into Recepção's model (V6)."
```

- [ ] concordo com todos os rótulos
- Violações que faltam: 
- Rótulos que não são violação: 
