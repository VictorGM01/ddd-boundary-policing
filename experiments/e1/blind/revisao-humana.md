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
