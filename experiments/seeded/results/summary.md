# Avaliação com violações semeadas: resultados

Gerado por `npm run eval:seeded`. Não edite à mão. Uma linha por caso em [results.csv](results.csv).

- Casos: **52** (42 violações, 10 controles legítimos)
- Baseline passa no gate: **sim** (688 ms)
- Tempo do gate por caso: média **533 ms**, mediana 526 ms (dependency-cruiser + ESLint em paralelo, processo completo)
- Data: 2026-11-12 · Node v22.18.0 · darwin

## Matriz de confusão por categoria

VP = violação detectada · FN = violação não detectada · FP = controle legítimo acusado · VN = controle legítimo sem alerta.

| Categoria | Casos | VP | FN | FP | VN | Taxa de detecção |
|---|---|---|---|---|---|---|
| V1 | 11 | 9 | 2 | 0 | 0 | 81.8% |
| V2 | 8 | 5 | 3 | 0 | 0 | 62.5% |
| V3 | 7 | 5 | 2 | 0 | 0 | 71.4% |
| V4 | 6 | 3 | 3 | 0 | 0 | 50.0% |
| V5 | 6 | 5 | 1 | 0 | 0 | 83.3% |
| V6 | 4 | 0 | 4 | 0 | 0 | 0.0% |
| CONTROL-LEGIT | 10 | 0 | 0 | 1 | 9 | 90.0% sem alerta |
| **Total** | 52 | 27 | 15 | 1 | 9 | 64.3% |

## Métricas gerais

| Métrica | Valor |
|---|---|
| Precisão (VP / (VP + FP)) | 96.4% |
| Revocação (VP / (VP + FN)), V1–V6 | 64.3% |
| Revocação no escopo estático (V1–V5) | 71.1% |
| Especificidade nos controles (VN / (VN + FP)) | 90.0% |
| Casos em que o resultado bateu com a expectativa registrada antes da execução | 51 / 52 |

## Falsos negativos

| Caso | Categoria | Esperado | Descrição |
|---|---|---|---|
| `v1-07-module-require-computed` | V1 | not_detected | Clinical loads billing PriceList via module.require with a path assembled at runtime. |
| `v1-11-local-constant-event-name` | V1 | not_detected | Same as v1-10 but the literal event name is stored in a local constant before being passed to @OnEvent. |
| `v2-04-delegate-by-variable` | V2 | not_detected | Clinical infrastructure reaches the billing table with a delegate name assembled at runtime. |
| `v2-05-raw-sql` | V2 | not_detected | Clinical infrastructure queries the BillingInvoice table with $queryRawUnsafe. |
| `v2-08-destructured-delegate` | V2 | not_detected | Clinical infrastructure destructures billingInvoice out of PrismaService. |
| `v3-06-bus-as-rpc` | V3 | not_detected | Clinical reads the value returned by the billing listener from emitAsync to show the invoice total right after completing the encounter. |
| `v3-07-globalthis-handle` | V3 | not_detected | Billing stores its InvoicingService on globalThis at startup and clinical calls it synchronously. |
| `v4-04-rich-contract-class` | V4 | not_detected | The clinical contract turns EncounterCompleted into a class with billing-related behaviour (isBillable, consultationIncluded). |
| `v4-05-bloated-payload` | V4 | not_detected | EncounterCompleted starts carrying diagnoses, clinical notes and timestamps, i.e. the whole internal encounter. |
| `v4-06-structural-copy` | V4 | not_detected | Billing declares a copy of the clinical EncounterSnapshot shape (same fields and status union) to work with encounters. |
| `v5-06-domain-concept-in-shared-kernel` | V5 | not_detected | The procedure price table (a billing concept) is moved into the shared kernel so clinical can show prices; no context is imported. |
| `v6-01-patient-in-billing` | V6 | not_detected | Billing introduces a Patient class with allergies and chronic conditions to adjust prices. |
| `v6-02-diagnoses-in-billing` | V6 | not_detected | Billing models an insurance claim carrying diagnosis codes and anamnesis notes for the payer. |
| `v6-03-scheduling-speaks-patient` | V6 | not_detected | Scheduling introduces a Patient with medical record number to book follow-up consultations. |
| `v6-04-triage-in-front-desk` | V6 | not_detected | Front desk prioritises the waiting queue by symptoms (a clinical triage rule). |

## Falsos positivos

| Caso | Regras disparadas | Descrição |
|---|---|---|
| `c-09-insurance-contracts-folder` | R2 | Billing models health-insurance agreements (convênios) in its own domain/contracts/ folder and imports them relatively. |

## Divergências em relação à expectativa registrada

| Caso | Esperado | Obtido | Regras esperadas | Regras disparadas |
|---|---|---|---|---|
| `c-09-insurance-contracts-folder` | not_detected | detected | — | R2 |

## Ferramentas nos verdadeiros positivos

| Detectado por | Casos |
|---|---|
| só dependency-cruiser | 0 |
| só ESLint | 8 |
| ambos | 19 |

## Disparos por regra

| Regra | Casos em que disparou |
|---|---|
| R1 | 11 |
| R2 | 2 |
| R3 | 2 |
| R4 | 2 |
| R5 | 5 |
| R6 | 1 |
| R7 | 3 |
| R8 | 3 |
| R9 | 1 |
| R10 | 1 |
| R11 | 2 |
| R13 | 1 |
