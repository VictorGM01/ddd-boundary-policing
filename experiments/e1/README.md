# Experimento E1

Um agente de IA (Claude Code headless, `claude-sonnet-5-5`) implementa as tarefas do [backlog](backlog.md) em cópias isoladas do baseline, com e sem as regras arquiteturais no contexto. O desenho está no [protocolo pré-registrado](protocolo.md); as decisões, nos ADR-016 a ADR-024 de [decisoes.md](../../docs/decisoes.md).

- [protocolo.md](protocolo.md): braços, hipóteses, métricas, desenho e análise, commitado antes da primeira execução
- [agent-rules.md](agent-rules.md): regras em linguagem natural; o harness gera as variantes dos braços B e C
- [backlog.md](backlog.md): tarefas T1–T6, com critérios de aceite e a tentação de cada uma
- [acceptance/](acceptance/): testes de aceite ocultos, um por tarefa, que entram na cópia só depois do agente
- [preflight.md](preflight.md): checagem do ambiente antes do piloto
- [discussao.md](discussao.md): leitura dos resultados contra H1–H3 e a lacuna
- `pilot/`, `runs/`: artefatos por execução (piloto e plano); `results/`: `runs.csv` e `summary.md`; `blind/`: ground truth cego

## Como rodar

```bash
npm run e1:preflight
```

```bash
npm run e1 -- --pilot
```

```bash
nohup caffeinate -dimsu npm run e1 -- --plan > experiments/e1/runs/harness.out 2>&1 &
```

```bash
npm run e1 -- --status
```

```bash
npm run e1:report
```

Uma execução avulsa: `npm run e1 -- --task T1 --arm A --rep 1`. O plano aceita `--reps n`, `--arms A,B,C` e `--concurrency n`. Ele é retomável: o estado fica em `runs/state.json` (gravação atômica), uma execução que estava `running` quando o processo parou é refeita do zero, falhas são tentadas mais uma vez, e um limite de uso da assinatura pausa o plano até o horário de reset. Ao terminar, o harness grava `runs/FINISHED.md` e regenera `results/`.

## O que a cópia do agente contém

| | Braço A | Braço B | Braço C |
|---|---|---|---|
| `src/`, `test/`, `prisma/`, configurações de build e teste | ✔ | ✔ | ✔ |
| `docs/`, `experiments/`, `README.md`, `.github/`, `scripts/eval-seeded.mjs`, `scripts/wrap-mermaid.mjs` | ✘ | ✘ | ✘ |
| `context-map.json`, `.dependency-cruiser.cjs`, `scripts/check-arch.mjs`, script `check:arch` | ✘ | ✘ | ✔ |
| `eslint.config.mjs` | só estilo/TypeScript | só estilo/TypeScript | original, com as regras |
| `CLAUDE.md` (variante de `agent-rules.md`) | ✘ | ✔, sem a frase do gate | ✔, com a frase do gate |

Toda cópia A/B passa por uma varredura de padrões que revelariam as regras; se algo aparecer, a execução é abortada.

## Contrato por execução

1. Copiar o baseline (`git archive e1-baseline` e clone APFS do `node_modules`) para `$TMPDIR/e1-runs/`, fora de qualquer projeto; aplicar a tabela acima; `git init` e commit do estado inicial, sem remote.
2. Rodar `claude -p` com o enunciado em inglês da tarefa, idêntico nos braços, ambiente limpo e flags de isolamento (ADR-018, ADR-019).
3. Coletar o diff contra o estado inicial.
4. Restaurar o gate com as regras do baseline, incorporando relações que o agente tenha declarado num `context-map.json` (ADR-017).
5. Rodar de fora: `check-arch.mjs --json`, `npm test`, typecheck e o teste de aceite oculto da tarefa.
6. Gravar em `runs/<run-id>/`: `meta.json`, `transcript.jsonl`, `agent.stderr.txt`, `diff.patch`, `gate.json`, `tests.json`, `acceptance.json`. Apagar a cópia.
7. Depois do plano: ground truth cego dos diffs (`blind/`), cruzamento com o gate e `results/summary.md`.
