# Avaliação com violações semeadas

Esta é a parte que transforma a demonstração em experimento (*Lacuna de pesquisa*, camada 3). Cada caso é uma alteração sobre o baseline, classificada pela [taxonomia](../../docs/taxonomia.md), com o resultado esperado registrado **antes** da primeira execução (os casos foram commitados antes dos resultados; ver `git log -- experiments/seeded`).

```bash
npm run eval:seeded                      # todos os casos
node scripts/eval-seeded.mjs --only v2   # filtro por id, não grava resultados
```

Resultados gerados: [results/summary.md](results/summary.md) · [results/results.csv](results/results.csv).

## Formato de um caso

```
cases/<id>/
  case.json   # id, category (V1–V6 | CONTROL-LEGIT), variant, description, expected, expectedRules
  files/      # overlay: arquivos que substituem ou se somam ao baseline, no mesmo caminho relativo à raiz
```

O runner copia o baseline (`src/`, `prisma/schema.prisma`, `context-map.json`, as configurações e o próprio gate) para um diretório temporário, aplica o overlay, executa `scripts/check-arch.mjs --json` e compara as regras disparadas com o esperado. Overlays de arquivos inteiros, em vez de diffs, não quebram quando o baseline evolui em outras linhas.

**Critério de detecção:** um caso é *detectado* se qualquer regra `Rn` disparar. A coluna `expected_rules_hit` registra à parte se as regras previstas estavam entre as disparadas.

## Leitura dos resultados (primeira execução)

| Categoria | Detecção | Leitura |
|---|---|---|
| V1 | 9/11 | Todo import estático é pego, inclusive `import type`, barrel, `import()` e `require` literais. Escapam o `module.require` com caminho calculado (R13 só olha `require(...)`) e o nome de evento guardado numa constante local (R10 só proíbe literal na chamada). |
| V2 | 5/8 | O `PrismaService` é técnico e compartilhado: o grafo não distingue model próprio de alheio. R7 cobre o padrão comum (`prisma.billingInvoice`, `prisma['…']`, tipo gerado), mas é sintática. Escapam a desestruturação, o nome do delegate calculado e o SQL bruto. |
| V3 | 5/7 | Tudo que exige import ou `ModuleRef`/`exports`/token string é pego. Escapam o uso do barramento como RPC (ler o retorno de `emitAsync`) e o `globalThis`. Sintaticamente, os dois são indistinguíveis de usos legítimos. |
| V4 | 3/6 | Quando o modelo vaza por import, é pego. Quando vaza por **forma** (classe com comportamento no contrato, payload que copia o modelo interno, tipo duplicado à mão), não há assinatura estrutural. É a categoria em que a fronteira entre estático e semântico aparece com mais clareza. |
| V5 | 5/6 | Pontes por import são todas pegas (R3, R5), inclusive a ponte em tempo de execução via `ModuleRef` em `src/common`. Escapa o conceito de domínio movido para o `shared-kernel` sem import. |
| V6 | 0/4 | Como previsto: sem dependência estrutural, não há o que a análise estática ver. Alvo do E2. |
| Controles | 9/10 sem alerta | Um falso positivo, descrito abaixo. |

### O falso positivo (`c-09-insurance-contracts-folder`)

O Faturamento modela convênios numa pasta própria `domain/contracts/` e a importa com `./contracts/insurance-agreement`. A versão ESLint de R2 é um `no-restricted-imports` com regex sobre a **string** do import (`(^|/)contracts/…`) e confunde essa pasta com `src/contracts/`. A versão do dependency-cruiser resolve o caminho real e não acusa nada. O falso positivo vem diretamente de uma limitação registrada em [regras.md](../../docs/regras.md): o `eslint-plugin-boundaries` v7 não captura elementos por arquivo, então R2 teve de ser escrita no ESLint por string.

A regra **não** foi ajustada depois da execução. Uma correção possível (ancorar a regex em `^@/contracts/` e em caminhos relativos que de fato saem de `src/modules/<x>/`) está registrada em [decisoes.md](../../docs/decisoes.md) (ADR-013) para uma próxima rodada, que deve ser reportada separadamente.

### Sobreposição de ferramentas

Nos 27 verdadeiros positivos, 19 foram detectados pelas duas ferramentas, 8 só pelo ESLint e nenhum só pelo dependency-cruiser. O dependency-cruiser não detectou nada que o ESLint não detectasse, mas ele é o único que verifica ciclos (R12) e arquivos soltos na raiz de `src/` (ver regras.md). O único falso positivo veio do ESLint. Portanto, o ESLint traz a maior parte da revocação marginal (regras sintáticas) e também o risco de falso positivo (regras por string).

## Ameaças à validade

- **Viés de autoria.** Os casos foram escritos por quem escreveu as regras, depois das regras. Isso explica por que 51 de 52 resultados bateram com a expectativa: as expectativas refletem conhecimento das regras, não um oráculo independente. A taxonomia foi definida antes das regras; os casos, não. É por isso que o E1 usa um agente de IA como fonte independente de violações.
- **Representatividade.** Os casos são pequenos e isolados. Em código real, uma violação vem misturada com mudanças legítimas, o que pode alterar o comportamento (por exemplo, ciclos).
- **Critério de detecção generoso.** Qualquer regra conta como detecção, mesmo que não seja a prevista. Em todos os VPs desta rodada, as regras previstas estavam entre as disparadas (`expected_rules_hit`).
- **Tempo do gate** medido em uma única máquina (ver data e plataforma no summary). O CI registra o tempo também no runner do GitHub.
