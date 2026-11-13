# E1: resultados

Gerado por `node scripts/e1/aggregate.mjs` (também chamado ao fim de `npm run e1 -- --plan`). Não edite à mão. Uma linha por execução em [runs.csv](runs.csv). Protocolo em [../protocolo.md](../protocolo.md).

- Execuções planejadas: **54** · concluídas: **54** · falhadas: **0** · não executadas: **0**
- Modelo do agente: `claude-sonnet-5-5` · Claude Code 2.1.285 · semente da ordem: 20261112
- Ground truth cego: **completo** (54 diffs rotulados)
- Relações novas entre contextos rotuladas e **declaradas** pelo agente no mapa (não contam como violação): T4-C-r3 (front-desk->billing), T4-C-r1 (front-desk->billing), T6-B-r1 (front-desk->clinical), T6-B-r2 (front-desk->clinical), T4-B-r1 (front-desk->billing), T4-C-r2 (front-desk->billing), T4-B-r2 (front-desk->billing), T6-B-r3 (front-desk->clinical), T6-C-r1 (front-desk->clinical), T6-C-r3 (front-desk->clinical), T6-C-r2 (front-desk->clinical), T4-B-r3 (front-desk->billing)

## Por braço

| Braço | Execuções | ≥1 violação (ground truth) | Violações/execução, média (mediana) | Gate reprovou | Violações do gate/execução, média | Aceite completo | `npm test` verde | Custo eq. médio | Duração média | Turnos médios |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 18 | 10/18 (55.6%) | 1.11 (1.0) | 9/18 (50.0%) | 2.50 | 12/18 | 18/18 | $0.26 | 1.3 min | 9.3 |
| B | 18 | 3/18 (16.7%) | 0.17 (0.0) | 0/18 (0.0%) | 0.00 | 12/18 | 18/18 | $0.27 | 1.3 min | 8.3 |
| C | 18 | 4/18 (22.2%) | 0.22 (0.0) | 0/18 (0.0%) | 0.00 | 12/18 | 18/18 | $0.27 | 1.4 min | 8.4 |

Aceite completo = todos os testes de aceite ocultos da tarefa passaram. Violações do gate contam cada ocorrência reportada (a mesma linha pode aparecer nas duas ferramentas).

## Violações por categoria × braço (ground truth)

| Categoria | A | B | C |
|---|---|---|---|
| V1 | 13 | 0 | 0 |
| V2 | 0 | 0 | 0 |
| V3 | 6 | 0 | 0 |
| V4 | 0 | 0 | 0 |
| V5 | 0 | 0 | 0 |
| V6 | 1 | 3 | 4 |
| **Total** | 20 | 3 | 4 |

## Violações por tarefa × braço (ground truth: total de violações / execuções com ≥1)

| Tarefa | A | B | C |
|---|---|---|---|
| T1 | 1 / 1 de 3 | 1 / 1 de 3 | 1 / 1 de 3 |
| T2 | 0 / 0 de 3 | 0 / 0 de 3 | 0 / 0 de 3 |
| T3 | 6 / 3 de 3 | 0 / 0 de 3 | 0 / 0 de 3 |
| T4 | 10 / 3 de 3 | 2 / 2 de 3 | 3 / 3 de 3 |
| T5 | 0 / 0 de 3 | 0 / 0 de 3 | 0 / 0 de 3 |
| T6 | 3 / 3 de 3 | 0 / 0 de 3 | 0 / 0 de 3 |

## Gate por tarefa × braço (execuções reprovadas / execuções)

| Tarefa | A | B | C |
|---|---|---|---|
| T1 | 0/3 | 0/3 | 0/3 |
| T2 | 0/3 | 0/3 | 0/3 |
| T3 | 3/3 | 0/3 | 0/3 |
| T4 | 3/3 | 0/3 | 0/3 |
| T5 | 0/3 | 0/3 | 0/3 |
| T6 | 3/3 | 0/3 | 0/3 |

Regras disparadas (execuções): R1 1 · R2 9 · R9 3.

## Detecção do gate contra o ground truth

Uma violação rotulada conta como detectada (VP) quando o gate acusou o mesmo arquivo com uma regra que cobre a categoria (mapeamento regra → categorias de `docs/regras.md`). Alertas do gate que não casam com nenhuma violação rotulada contam como falsos positivos (FP).

| Categoria | Violações reais (agente) | VP | FN | Detecção (agente) | Detecção (avaliação semeada) |
|---|---|---|---|---|---|
| V1 | 13 | 7 | 6 | 53.8% | 81.8% (9/11) |
| V2 | 0 | 0 | 0 | — | 62.5% (5/8) |
| V3 | 6 | 3 | 3 | 50.0% | 71.4% (5/7) |
| V4 | 0 | 0 | 0 | — | 50.0% (3/6) |
| V5 | 0 | 0 | 0 | — | 83.3% (5/6) |
| V6 | 8 | 0 | 8 | 0.0% | 0.0% (0/4) |
| **Total** | 27 | 10 | 17 | 37.0% | 64.3% |

- Alertas do gate, contados uma vez por par (regra, arquivo) mesmo quando as duas ferramentas acusam: **24**. Sem violação rotulada correspondente (FP): **14** em 6 execução(ões).
- Dos FP, **3** estão num arquivo que tem violação rotulada de outra categoria (o gate acusou o lugar certo com uma regra que não cobre a categoria do rótulo) e **11** em arquivo sem violação rotulada: T3-A-r1 R2 `src/modules/billing/application/invoicing.service.spec.ts`; T3-A-r1 R2 `src/modules/billing/application/invoicing.service.ts`; T4-A-r1 R2 `src/modules/front-desk/application/visits.service.spec.ts`; T3-A-r2 R2 `src/modules/billing/application/invoicing.service.spec.ts`; T3-A-r2 R2 `src/modules/billing/application/invoicing.service.ts`; T4-A-r2 R2 `src/modules/billing/application/invoicing.service.ts`; T4-A-r2 R2 `src/modules/front-desk/application/visits.service.spec.ts`; T4-A-r3 R2 `src/modules/billing/application/invoicing.service.ts`; T4-A-r3 R2 `src/modules/front-desk/application/visits.service.spec.ts`; T3-A-r3 R2 `src/modules/billing/application/invoicing.service.spec.ts`; T3-A-r3 R2 `src/modules/billing/application/invoicing.service.ts`.
- FP por regra: R2 14.
- Nível de execução: das 17 execuções com ≥1 violação rotulada, o gate reprovou 9; das 37 sem violação rotulada, o gate reprovou 0.

**H3** (detecção abaixo da semeada em V4 e V6): V4 sem ocorrências no agente vs. 50.0% na semeada; V6 0.0% no agente vs. 0.0% na semeada. Com V6 a 0% na semeada, "abaixo" é impossível por construção; o teste efetivo de H3 é em V4.

## Testes exploratórios de H1 e H2

> **Aviso.** n pequeno (no máximo 18 execuções por braço, 3 por célula). Os p-valores são exploratórios, sem correção para comparações múltiplas, e não sustentam afirmação de significância. O que importa é a direção e o tamanho do efeito descritivo, lidos junto com as tabelas acima.

| Medida | Execuções com ≥1 violação | Fisher, unilateral (A > B), p | Fisher, bilateral, p | Violações/execução, média | U de Mann-Whitney | z | MW unilateral (A > B), p | MW bilateral, p |
|---|---|---|---|---|---|---|---|---|
| Ground truth (todas as categorias) | A 10/18 · B 3/18 | 0.018 | 0.035 | A 1.11 · B 0.17 | 234.0 | 2.66 | 0.004 | 0.008 |
| Ground truth sem V1.b de relação nova não declarada | A 4/18 · B 3/18 | 0.500 | 1.000 | A 0.44 · B 0.17 | 175.5 | 0.62 | 0.276 | 0.551 |
| Gate (violações reportadas) | A 9/18 · B 0/18 | < 0.001 | 0.001 | A 2.50 · B 0.00 | 243.0 | 3.37 | < 0.001 | < 0.001 |

H1 usa a coluna de Fisher (proporção de execuções com ≥1 violação); H2 usa Mann-Whitney (violações por execução). Mann-Whitney com aproximação normal, correção de empates e de continuidade.

## Recursos utilizados

Tokens e custo vêm da saída JSON do Claude Code (`total_cost_usd` e `usage` do evento `result`). **O custo é uma estimativa calculada a preço de API: as execuções usaram a assinatura do aluno (login do Claude Code), então não é um valor efetivamente pago.**

| | Execuções | Tokens de entrada | Tokens de saída | Cache (leitura) | Cache (escrita) | Custo eq. (US$) | Soma das durações | Turnos |
|---|---|---|---|---|---|---|---|---|
| Braço A | 18 | 322 | 166,513 | 3,589,036 | 556,998 | 4.61 | 0.38 h | 168 |
| Braço B | 18 | 282 | 185,410 | 3,178,437 | 576,376 | 4.80 | 0.40 h | 150 |
| Braço C | 18 | 282 | 174,935 | 3,220,090 | 598,263 | 4.79 | 0.42 h | 151 |
| **Total do plano** | 54 | 886 | 526,858 | 9,987,563 | 1,731,637 | 14.19 | 1.20 h | 469 |
| Piloto (fora dos resultados) | 4 | 72 | 37,650 | 824,381 | 128,333 | 1.05 | 0.09 h | 38 |

- Tempo de parede do plano: 13.44 h (concorrência 2; inclui avaliação, pausas e o intervalo ocioso de cerca de 12 h entre o fim de A+B e o início do braço C, ADR-024). Soma das durações das execuções do agente: 1.20 h.
- Execuções refeitas (falha ou interrupção antes de concluir): 2. Pausas por limite de uso: 0.
- Máquina: Mac16,12, Apple M4, 16 GB de RAM, macOS 26.6.2, Node v22.18.0, Claude Code 2.1.285.
- O consumo da sessão orquestradora (a sessão do Claude Code que montou o harness, rodou o piloto e fez a rotulagem) **não é medido pelo harness** e não está nos números acima.

## Exemplos

Trechos reais de violação do braço A (rotulagem cega) e o que o braço B fez na mesma tarefa.

### T6-A-r1 · V1 (V1.b-undeclared-relation) · detectada pelo gate

`src/modules/front-desk/api/clinical-events.listener.ts`

```ts
@OnEvent(ClinicalEvents.EncounterStarted)
```

Justificativa da rotulagem: Front-desk imports the clinical contract and listens to a clinical event, but clinical is downstream (not upstream) of front-desk in the map, a relation outside the map (taxonomy V1.b) that also creates a cycle.

Braço B na mesma tarefa: T6-B-r1 com 0 violação(ões) rotulada(s), gate aprovado, declarou relação nova no mapa; T6-B-r2 com 0 violação(ões) rotulada(s), gate aprovado, declarou relação nova no mapa; T6-B-r3 com 0 violação(ões) rotulada(s), gate aprovado, declarou relação nova no mapa.

Arquivos alterados em T6-B-r1: `context-map.json`, `prisma/schema.prisma`, `src/contracts/clinical.events.ts`, `src/modules/clinical/application/encounters.service.ts`, `src/modules/front-desk/api/clinical-events.listener.ts`, `src/modules/front-desk/api/visits.controller.ts`, `src/modules/front-desk/application/visits.service.spec.ts`, `src/modules/front-desk/application/visits.service.ts`, `src/modules/front-desk/domain/queue-metrics.ts`, `src/modules/front-desk/domain/visit.repository.ts`, `src/modules/front-desk/domain/visit.spec.ts`, `src/modules/front-desk/domain/visit.ts`.

### T4-A-r1 · V3 (V3-sync-query-injection) · não detectada pelo gate

`src/modules/front-desk/application/visits.service.ts`

```ts
private readonly overdueBalances: OverdueBalanceQuery, ... await this.overdueBalances.hasOverdueBalance(
```

Justificativa da rotulagem: Front-desk synchronously calls a billing-provided service (request/response) during check-in instead of reacting to events, a synchronous inter-module call per V3.

Braço B na mesma tarefa: T4-B-r1 com 1 violação(ões) rotulada(s) (V6), gate aprovado, declarou relação nova no mapa; T4-B-r2 com 0 violação(ões) rotulada(s), gate aprovado, declarou relação nova no mapa; T4-B-r3 com 1 violação(ões) rotulada(s) (V6), gate aprovado, declarou relação nova no mapa.

Arquivos alterados em T4-B-r2: `context-map.json`, `prisma/schema.prisma`, `src/contracts/billing.events.ts`, `src/modules/billing/application/invoicing.service.spec.ts`, `src/modules/billing/application/invoicing.service.ts`, `src/modules/front-desk/api/billing-events.listener.ts`, `src/modules/front-desk/application/visits.service.spec.ts`, `src/modules/front-desk/application/visits.service.ts`, `src/modules/front-desk/domain/outstanding-balance.repository.ts`, `src/modules/front-desk/domain/outstanding-balance.spec.ts`, `src/modules/front-desk/domain/outstanding-balance.ts`, `src/modules/front-desk/domain/visit.errors.ts`.

### T1-A-r2 · V6 (V6-refund-in-scheduling) · não detectada pelo gate

`src/contracts/scheduling.events.ts`

```ts
/** The clinic cancelled and the person must get back what was charged... */ refund: boolean;
```

Justificativa da rotulagem: Scheduling's published language and cancel logic now model a refund (a billing concept and decision about charges) instead of just stating the cancellation fact, a ubiquitous-language leak (V6); judged borderline but billing terms are clearly in scheduling.

Braço B na mesma tarefa: T1-B-r1 com 0 violação(ões) rotulada(s), gate aprovado; T1-B-r2 com 1 violação(ões) rotulada(s) (V6), gate aprovado; T1-B-r3 com 0 violação(ões) rotulada(s), gate aprovado.

Arquivos alterados em T1-B-r1: `src/contracts/scheduling.events.ts`, `src/modules/billing/api/scheduling-events.listener.ts`, `src/modules/billing/application/invoicing.service.spec.ts`, `src/modules/billing/application/invoicing.service.ts`, `src/modules/billing/domain/invoice.spec.ts`, `src/modules/billing/domain/invoice.ts`, `src/modules/billing/infrastructure/prisma-invoice.repository.ts`, `src/modules/scheduling/api/appointments.controller.ts`, `src/modules/scheduling/application/appointments.service.spec.ts`, `src/modules/scheduling/application/appointments.service.ts`, `src/modules/scheduling/domain/appointment.spec.ts`, `src/modules/scheduling/domain/appointment.ts`.

## Ameaças à validade

- **Um só estudo de caso.** Um protótipo pequeno (4 contextos), escrito para o estudo. O comportamento do agente em bases maiores e menos regulares pode ser outro.
- **Um só modelo e uma só ferramenta.** Todas as execuções usam `claude-sonnet-5-5` no Claude Code, com esforço e limites fixos. Outros modelos e agentes podem errar mais, menos ou de outro jeito.
- **n pequeno.** 3 repetições por célula; os testes estatísticos são exploratórios.
- **Rotulagem por LLM.** O ground truth foi produzido por subagentes de um modelo de linguagem, cegos para braço, tarefa e gate, e não por humanos. Há uma amostra para revisão humana em `blind/revisao-humana.md`. A cegueira é imperfeita: `context-map.json` foi retirado dos diffs (ADR-024), mas um comentário ou o estilo da solução ainda pode denunciar o braço.
- **Tarefas e regras do mesmo autor.** As tarefas do backlog foram desenhadas por quem desenhou as regras, com a tentação de violação em mente.
- **Não determinismo.** O mesmo prompt produz soluções diferentes; a variância entre repetições é parte do resultado.
- **Critério de detecção por arquivo e categoria.** Uma violação conta como detectada quando o gate acusa o mesmo arquivo com uma regra que cobre a categoria; isso pode superestimar a detecção quando o arquivo tem várias violações.
- **Testes de aceite parciais.** T2 não verifica o preço de uma prescrição precificada e T4 não verifica fatura paga (o enunciado não define essas interfaces); T3 e T6 aceitam formatos de resposta variados.
- **Critérios de aceite fora do enunciado.** Um teste de T2 (prescrição sem preço não impede as demais linhas) e um de T6 (quem ainda espera entra no máximo) verificam critérios que estão só no backlog em português, não no enunciado em inglês dado ao agente; falham em todos os braços (ADR-024). Não enviesam a comparação entre braços, mas o aceite completo dessas tarefas não mede o que o agente foi pedido a fazer.
- **Braço C em outro horário.** O braço C rodou cerca de 12 horas depois de A+B (ADR-024); a comparação B×C supõe que o serviço do modelo não mudou nesse intervalo.
