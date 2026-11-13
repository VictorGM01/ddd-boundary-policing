COMPLETO: 36 de 36 execuções concluídas.

## ⚠️ Pontos de atenção para o aluno

- Preflight (experiments/e1/preflight.md): o Mac estava **na bateria** (cerca de 45%) quando o experimento foi montado. O `caffeinate -s` não impede o repouso na bateria; se a bateria acabar, o plano para no meio e retoma do ponto em que parou quando for executado de novo (`npm run e1 -- --plan`). A ordem em blocos de replicação (ADR-021) garante repetições completas de todas as células mesmo assim.
- Preflight: disco com cerca de **4 GiB livres (98% usado)**. As cópias usam clone APFS e são apagadas a cada execução, mas um disco cheio derrubaria execuções (aparecem como `failed`).
- Sem container: o agente rodou com as permissões do usuário no Mac (ADR-018). O harness procura caminhos fora da cópia nas chamadas de ferramenta; ocorrências aparecem nesta lista, por execução.
- Testes de aceite parciais em T2 (preço de prescrição não verificável) e T4 (fatura paga não verificável); T3 e T6 aceitam formatos variados (ADR-020).
- Decisões tomadas sem o aluno: estão nos ADR-016 a ADR-022 (e seguintes) de docs/decisoes.md.
- T5-A-r1: o agente alterou testes ou configuração de teste existentes: M test/clinic-flow.e2e-spec.ts (2 assertion/test line(s) removed).
- T3-A-r1: possível menção às regras na transcrição do braço A: `":"toolu_01HA7f6Ta8EAamLBfVeRGA6a","name":"Bash","input":{"command":"ls -a; cat .dependency-cruiser* 2>/dev/null | head -80; cat src/modules/scheduling/scheduli` (2 ocorrência(s)).
- T3-B-r1: o agente alterou testes ou configuração de teste existentes: M src/modules/billing/application/invoicing.service.spec.ts (1 assertion/test line(s) removed).
- T4-A-r1: possível menção às regras na transcrição do braço A: ` infrastructure/*.ts; cd ../../..; cat test/clinic-flow.e2e-spec.ts; ls -a; cat .dependency-cruiser* 2>/dev/null | head -50"},"caller":{"type":"direct"}}],"cont` (2 ocorrência(s)).
- T4-B-r1: relation declared by agent: billing → front-desk; published contract declared by agent: billing publishes billing.events.ts.
- T6-B-r1: relation declared by agent: clinical → front-desk.
- T4-A-r2: possível menção às regras na transcrição do braço A: `ts/*.ts infrastructure/http/domain-error.filter.ts; cat ../eslint.config.mjs ../.dependency-cruiser* 2>/dev/null | head -150"},"caller":{"type":"direct"}}],"con` (2 ocorrência(s)).
- T6-A-r2: possível menção às regras na transcrição do braço A: `ts test/global-setup.ts src/modules/front-desk/domain/visit.spec.ts; ls -a; cat .dependency-cruiser* 2>/dev/null | head -80"},"caller":{"type":"direct"}}],"cont` (2 ocorrência(s)).
- T4-B-r2: relation declared by agent: billing → front-desk; published contract declared by agent: billing publishes billing.events.ts.
- T6-B-r2: relation declared by agent: clinical → front-desk.
- T3-B-r2: o agente alterou testes ou configuração de teste existentes: M src/modules/billing/application/invoicing.service.spec.ts (1 assertion/test line(s) removed).
- T6-B-r3: relation declared by agent: clinical → front-desk.
- T2-A-r3: possível menção às regras na transcrição do braço A: `cing.service.spec.ts; cd ../../..; cat test/clinic-flow.e2e-spec.ts; ls -a; cat .dependency-cruiser* 2>/dev/null | head -50"},"caller":{"type":"direct"}}],"cont` (4 ocorrência(s)).
- T3-B-r3: o agente alterou testes ou configuração de teste existentes: M src/modules/billing/application/invoicing.service.spec.ts (1 assertion/test line(s) removed).
- T6-A-r3: possível menção às regras na transcrição do braço A: `est/clinic-flow.e2e-spec.ts src/contracts/../shared-kernel/index.ts; ls -a; cat .dependency-cruiser* 2>/dev/null | head -80; cat src/modules/billing/api/clinica` (2 ocorrência(s)).
- T4-B-r3: o agente alterou testes ou configuração de teste existentes: M src/modules/front-desk/domain/visit.spec.ts (2 assertion/test line(s) removed).
- T4-B-r3: relation declared by agent: billing → front-desk; published contract declared by agent: billing publishes billing.events.ts.
- T3-A-r3: possível menção às regras na transcrição do braço A: `":"toolu_01THHJTvonns4xycuo3ckfhR","name":"Bash","input":{"command":"ls -a; cat .dependency-cruiser* 2>/dev/null | head -80; cat README* CLAUDE.md 2>/dev/null |` (2 ocorrência(s)).
- Execuções refeitas antes de concluir: T5-A-r1, T6-A-r1.

## Status (plano "main", semente 20261112)

- Início: 2026-11-12T22:40:40.235Z · fim: 2026-11-12T23:10:40.607Z
- Custo equivalente estimado (preço de API; a execução usou assinatura): $9.41
- Pausas por limite de uso: 0

| Execução | Status | Aceite | `npm test` | Gate (violações) | Turnos | Custo eq. | Duração |
|---|---|---|---|---|---|---|---|
| T5-A-r1 | done | 3/3 | sim | 0 | 12 | $0.33 | 2 min |
| T6-A-r1 | done | 0/2 | sim | 2 (R2) | 6 | $0.19 | 1 min |
| T5-B-r1 | done | 3/3 | sim | 0 | 8 | $0.23 | 1 min |
| T2-A-r1 | done | 1/2 | sim | 0 | 10 | $0.23 | 1 min |
| T3-A-r1 | done | 2/2 | sim | 4 (R2) | 9 | $0.28 | 1 min |
| T3-B-r1 | done | 2/2 | sim | 0 | 7 | $0.26 | 1 min |
| T1-A-r1 | done | 3/3 | sim | 0 | 8 | $0.27 | 1 min |
| T1-B-r1 | done | 3/3 | sim | 0 | 8 | $0.26 | 1 min |
| T4-A-r1 | done | 3/3 | sim | 7 (R2, R9) | 11 | $0.24 | 1 min |
| T4-B-r1 | done | 3/3 | sim | 0 | 11 | $0.35 | 2 min |
| T2-B-r1 | done | 1/2 | sim | 0 | 6 | $0.22 | 1 min |
| T6-B-r1 | done | 0/2 | sim | 0 | 8 | $0.25 | 1 min |
| T3-A-r2 | done | 2/2 | sim | 4 (R2) | 9 | $0.28 | 1 min |
| T4-A-r2 | done | 3/3 | sim | 11 (R1, R2, R9) | 11 | $0.25 | 1 min |
| T5-A-r2 | done | 3/3 | sim | 0 | 13 | $0.31 | 2 min |
| T6-A-r2 | done | 0/2 | sim | 2 (R2) | 7 | $0.19 | 1 min |
| T4-B-r2 | done | 3/3 | sim | 0 | 11 | $0.34 | 2 min |
| T2-A-r2 | done | 1/2 | sim | 0 | 17 | $0.45 | 2 min |
| T1-A-r2 | done | 3/3 | sim | 0 | 9 | $0.25 | 1 min |
| T1-B-r2 | done | 3/3 | sim | 0 | 9 | $0.29 | 1 min |
| T2-B-r2 | done | 1/2 | sim | 0 | 7 | $0.22 | 1 min |
| T6-B-r2 | done | 0/2 | sim | 0 | 6 | $0.23 | 1 min |
| T3-B-r2 | done | 2/2 | sim | 0 | 9 | $0.26 | 1 min |
| T5-B-r2 | done | 3/3 | sim | 0 | 7 | $0.23 | 1 min |
| T6-B-r3 | done | 0/2 | sim | 0 | 11 | $0.28 | 1 min |
| T2-A-r3 | done | 1/2 | sim | 0 | 8 | $0.21 | 1 min |
| T3-B-r3 | done | 2/2 | sim | 0 | 8 | $0.25 | 1 min |
| T5-A-r3 | done | 3/3 | sim | 0 | 9 | $0.23 | 1 min |
| T2-B-r3 | done | 1/2 | sim | 0 | 8 | $0.30 | 1 min |
| T5-B-r3 | done | 3/3 | sim | 0 | 10 | $0.24 | 1 min |
| T6-A-r3 | done | 0/2 | sim | 2 (R2) | 7 | $0.19 | 1 min |
| T1-A-r3 | done | 3/3 | sim | 0 | 8 | $0.23 | 1 min |
| T1-B-r3 | done | 3/3 | sim | 0 | 7 | $0.29 | 2 min |
| T4-A-r3 | done | 3/3 | sim | 9 (R2, R9) | 7 | $0.21 | 1 min |
| T4-B-r3 | done | 3/3 | sim | 0 | 9 | $0.30 | 1 min |
| T3-A-r3 | done | 2/2 | sim | 4 (R2) | 7 | $0.27 | 1 min |

Gerado por `npm run e1 -- --finish`. Resultados agregados em `experiments/e1/results/`.
