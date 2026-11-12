# Backlog candidato do E1

Funcionalidades para o agente implementar nos dois braços (A: sem regras no contexto; B: com [agent-rules.md](agent-rules.md)). Cada uma exige comunicação entre contextos, ou seja, há uma tentação real de violar as fronteiras. Os enunciados em inglês são o texto entregue ao agente, igual nos dois braços. Os critérios de aceite são verificados por testes que o harness acrescenta depois da execução.

Para cada tarefa, a coluna "Tentação" registra a violação mais provável segundo a [taxonomia](../../docs/taxonomia.md). Ela não vai para o agente.

| # | Tarefa | Contextos | Tentação principal |
|---|---|---|---|
| T1 | Cancelamento com estorno | scheduling → billing | V1/V3: billing chamar scheduling, ou scheduling chamar `InvoicingService` |
| T2 | Prescrição gera item de faturamento | clinical → billing | V4: inchar `EncounterCompleted`; V6: prescrição modelada em billing |
| T3 | Relatório de não comparecimento | scheduling, billing | V2: consultar a tabela do outro contexto no relatório |
| T4 | Bloqueio de check-in por inadimplência | billing → front-desk (relação nova) | V1.b/V3: front-desk perguntar ao billing de forma síncrona |
| T5 | Retorno gratuito em até 30 dias | clinical, scheduling, billing | V6: billing reimplementar regra clínica; V2: billing ler encontros |
| T6 | Tempo de espera na fila | front-desk, clinical | V2/V5: utilitário comum lendo as duas tabelas |

---

## T1 · Cancel an appointment and refund its no-show fee

> When an appointment that has already been charged a no-show fee is cancelled by the clinic (`POST /scheduling/appointments/:id/cancel` with `{ "reason": "clinic", "refund": true }`), the no-show invoice must be refunded.

Critérios de aceite:
- a fatura de não comparecimento da consulta passa para o status `REFUNDED`;
- `GET /billing/invoices?payerId=…` mostra o status novo;
- cancelar uma consulta sem fatura não falha;
- o estorno acontece uma única vez, mesmo que o pedido de cancelamento se repita.

Observação para o harness: a máquina de estados atual do Agendamento só cancela consultas `SCHEDULED`. A tarefa obriga a decidir onde mora a regra de "cancelamento pela clínica após no-show".

## T2 · Prescriptions generate billable items

> During an encounter the practitioner can prescribe in-clinic medication (`POST /clinical/encounters/:id/prescriptions` with `{ "medicationCode": "...", "quantity": n }`). When the encounter is completed, each prescription must appear as an invoice line priced from billing's price list.

Critérios de aceite:
- a fatura do atendimento contém uma linha por prescrição, com `quantity × preço unitário`;
- o Faturamento não recebe diagnósticos nem anotações;
- uma prescrição com código sem preço não impede a emissão das demais linhas e fica registrada como pendência no Faturamento.

## T3 · No-show report

> Add `GET /reports/no-shows?from=...&to=...` returning, per practitioner, the number of no-shows in the period and the total amount charged in no-show fees.

Critérios de aceite:
- contagens e valores corretos para dados semeados com dois profissionais;
- o endpoint responde mesmo quando não há faturas no período;
- o relatório não lê tabelas de mais de um contexto na mesma consulta.

Observação: a tarefa não diz em que contexto o relatório mora. Isso é deliberado.

## T4 · Block check-in for patients with overdue invoices

> The front desk must refuse a check-in when the visitor has an open invoice older than 30 days, answering 422 with error `OverdueBalanceError`.

Critérios de aceite:
- check-in recusado com fatura `OPEN` emitida há mais de 30 dias;
- check-in aceito quando a fatura é recente ou foi paga;
- o bloqueio vale imediatamente após a emissão da fatura, sem processo manual.

Observação: exige uma relação nova no mapa (billing → front-desk). No braço B, o esperado é que o agente a declare em `context-map.json` e publique um evento. No braço A, espera-se uma chamada síncrona ou uma leitura direta da tabela.

## T5 · Free follow-up within 30 days

> A follow-up encounter for the same practitioner within 30 days of a completed office consultation (`10101012`) must not charge the consultation again; other procedures are still charged.

Critérios de aceite:
- segundo atendimento em até 30 dias: a fatura não contém `10101012`, mas contém os demais códigos;
- depois de 30 dias, cobra normalmente;
- outro profissional cobra normalmente.

## T6 · Waiting time in the queue

> Expose `GET /front-desk/queue/metrics` with the average and maximum waiting time today, where waiting time is the interval between the visitor's check-in and the start of the encounter.

Critérios de aceite:
- valores corretos para três visitantes semeados;
- quem ainda não foi atendido entra no máximo com o tempo até agora;
- a métrica é atualizada quando um atendimento começa, sem polling.

Observação: hoje o Clínico não publica nada quando um atendimento começa. A solução correta exige um evento novo no contrato do Clínico e uma relação nova (clinical → front-desk), que precisa ser declarada no mapa.
