# Experimento E1: protocolo pré-registrado

Este protocolo foi commitado **antes da primeira execução real** do agente (piloto incluído). Mudanças posteriores ficam registradas no fim do documento, com data e motivo, e são reportadas como desvios. Baseline: tag `e1-baseline` (commit `78875ea`), com protótipo, regras R1–R13 e gate congelados durante todo o E1.

## Pergunta

Quando um agente de codificação por IA implementa funcionalidades reais no protótipo, quantas violações arquiteturais ele comete espontaneamente, de quais categorias da [taxonomia](../../docs/taxonomia.md), e **expor as regras arquiteturais no contexto do agente reduz isso?** Das violações que o agente comete, quantas o gate `check:arch` detecta?

## Braços

| Braço | O que o agente recebe | Papel |
|---|---|---|
| **A, sem regras** | Só o enunciado da tarefa, numa cópia do baseline sem documentação, sem o mapa legível por máquina e sem o gate | Controle |
| **B, com regras** | Igual ao A, mais [`agent-rules.md`](agent-rules.md) como arquivo de instruções do agente (`CLAUDE.md` na raiz da cópia), na variante sem a frase sobre `check:arch` | Tratamento principal |
| **C, com regras e gate** (opcional) | Igual ao B, mais o gate na cópia (`npm run check:arch`, `context-map.json`, configurações) e a variante de `agent-rules.md` que manda o gate passar antes de terminar | "Ciclo fechado" da camada 4 da lacuna; só roda se o orçamento permitir depois de A+B |

A comparação principal é **A vs. B**. A diferença entre A e B é só o arquivo de regras; entre B e C, só o gate. O que exatamente sai da cópia em cada braço está no [README](README.md) e no ADR-017.

## Hipóteses

- **H1.** O braço B tem menos execuções com pelo menos uma violação do que o braço A.
- **H2.** O braço B tem menos violações por execução do que o braço A.
- **H3.** A taxa de detecção do gate sobre violações reais do agente fica abaixo da taxa da avaliação semeada nas categorias V4 e V6.

H1 e H2 são avaliadas com o ground truth cego (medida principal) e, à parte, com as violações reportadas pelo gate (medida secundária). Para H3, a referência é a avaliação semeada (V4 50%, V6 0%); como V6 já é 0% na semeada, o teste efetivo de H3 é em V4, e em V6 só se registra a ausência de detecção.

## Desenho

- **Tarefas:** T1–T6 de [backlog.md](backlog.md). O prompt é o enunciado em inglês da tarefa (o bloco de citação do backlog, verbatim) seguido de: "Implement this feature in this repository, including tests. Finish with `npm test` passing." O prompt é idêntico em todos os braços.
- **Repetições:** 3 por célula (tarefa × braço). Plano A+B: 6 × 2 × 3 = **36 execuções**.
- **Ordem:** blocos de replicação. Em cada bloco, as 12 células (tarefa × braço) aparecem uma vez, em ordem aleatória gerada por `mulberry32` com **semente 20261112**. O bloco 2 só começa depois do bloco 1, e assim por diante, para que um plano interrompido ainda cubra todas as células (ADR-021). A ordem planejada fica em `runs/state.json`.
- **Agente:** Claude Code em modo headless (`claude -p`), um processo por execução, chamado pelo harness. **Modelo fixo `claude-sonnet-5-5`**, esforço `high`, no máximo **40 turnos**, **timeout de 20 minutos**. Versão do Claude Code registrada em cada execução (2.1.285 no início do E1).
- **Isolamento:** cópia nova do baseline em `$TMPDIR/e1-runs/`, fora de qualquer projeto, com `git init` e nenhum remote; ambiente de processo limpo; só configurações do projeto (`--setting-sources project`), skills desativadas, nenhum MCP, sem persistência de sessão; ferramentas web desativadas igualmente em todos os braços (ADR-018 e ADR-019).
- **Concorrência:** 2 execuções ao mesmo tempo, cada uma na sua cópia.
- **Falhas:** uma execução que falha (timeout, crash, erro de rede) é tentada mais uma vez; se falhar de novo, fica `failed` e o plano segue. Atingir o limite de turnos **não** é falha: é um resultado e entra nos dados. Limite de uso da assinatura pausa o plano e não conta como tentativa.

## Procedimento por execução

1. Preparar a cópia do braço e commitar o estado inicial.
2. Rodar o agente com o prompt da tarefa e capturar a transcrição (`stream-json`).
3. Coletar o diff contra o estado inicial (sem `node_modules`, artefatos e `package-lock.json`).
4. Restaurar o gate na cópia com as regras do baseline. Se o agente declarou relações num `context-map.json` (braço B, ou C), elas são incorporadas ao mapa antes de rodar o gate, como aconteceria no método real.
5. Rodar, de fora, o gate (`check-arch.mjs --json`), o `npm test` do próprio projeto, o typecheck e o teste de aceite oculto da tarefa (`acceptance/Tn.e2e-spec.ts`, que entra na cópia só nesse momento).
6. Gravar os artefatos em `runs/<run-id>/` e apagar a cópia.

## Métricas

Por execução e agregadas por braço e por tarefa:

- violações por execução, pelo gate e pelo ground truth;
- proporção de execuções com ≥1 violação;
- violações por categoria V1–V6;
- taxa de detecção do gate contra o ground truth: VP e FN por categoria, e FP;
- sucesso funcional: testes de aceite ocultos (todos passam / quantos passam) e `npm test` do projeto;
- custo equivalente estimado, tokens (entrada, saída, cache de leitura e de escrita), duração, número de turnos;
- braço C: se o agente rodou o gate e quantas vezes.

## Ground truth cego

1. Cada `diff.patch` é copiado para `blind/` com um id aleatório, sem braço, tarefa ou saída do gate; o mapeamento fica num arquivo separado.
2. Cada diff é classificado segundo a taxonomia por um rotulador que vê só o diff, a taxonomia, o mapa de contextos e a linguagem ubíqua: categoria, arquivo, trecho e justificativa de cada violação. Um diff sem violação recebe uma linha `NONE`. A classificação termina antes de qualquer cruzamento com o gate.
3. Só então os rótulos são juntados ao mapeamento e ao gate para calcular VP, FN e FP.
4. Uma amostra de cerca de 10 diffs vai para revisão humana (`blind/revisao-humana.md`).

**Relação nova entre contextos.** Uma integração por eventos que cria uma relação fora do mapa do baseline (por exemplo, Faturamento → Recepção em T4) é V1.b quando não declarada no mapa. Como só o braço B foi instruído a declarar relações, ela é rotulada com a subcategoria `V1.b-undeclared-relation` e as hipóteses são reportadas também **sem** essa subcategoria (análise de sensibilidade), para separar "acoplamento indevido" de "decisão estratégica não registrada".

## Análise planejada

- Estatística descritiva por braço e por tarefa (contagens, média, mediana).
- **H1:** teste exato de Fisher sobre a tabela 2×2 (braço × execução com/sem violação), unilateral (A > B) e bilateral.
- **H2:** Mann-Whitney U sobre violações por execução, unilateral (A > B) e bilateral.
- **Todos os testes são exploratórios** por causa do n pequeno (18 execuções por braço). Nada de afirmar significância que o n não sustenta; o resultado é lido pela direção e pelo tamanho do efeito descritivo.
- **H3:** comparação descritiva das taxas de detecção por categoria com a avaliação semeada.

## Orçamento e piloto

- **Piloto:** T1 e T4, braços A e B, 1 repetição (4 execuções), antes do plano completo. Verifica isolamento (no braço A, a transcrição não pode conter `check:arch`, ids de regra, `context-map`, `dependency-cruiser`), completude dos artefatos e custo médio. **As execuções do piloto ficam em `pilot/` e não entram nos resultados finais**, mesmo que o protocolo não mude.
- **Projeção:** o plano A+B roda com 3 repetições se a projeção do piloto couber no limite de uso da assinatura; senão, 2 repetições (24 execuções); se nem isso couber, os blocos de replicação garantem que a interrupção deixe a 1ª repetição completa. O braço C só roda se, depois de A+B, ainda houver folga.
- A decisão de orçamento é registrada em ADR antes do lançamento do plano.

## Desvios

Qualquer mudança neste protocolo depois do commit vai para esta seção, com data, motivo e se aconteceu antes ou depois de ver resultados.

- (nenhum até o momento)
