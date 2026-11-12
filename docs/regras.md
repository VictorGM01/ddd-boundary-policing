# Regras de policiamento

Este documento é a contribuição central do método: cada regra estática é **derivada de um elemento do [mapa de contextos](mapa-de-contextos.md)** e **justificada pelas categorias da [taxonomia](taxonomia.md)** que pretende cobrir. A taxonomia veio antes; as regras foram escritas depois para tentar cobri-la, e o que elas deixam passar é medido em `experiments/seeded/` (ver [summary](../experiments/seeded/results/summary.md)).

## Como as regras são derivadas

A derivação segue quatro passos, que podem ser repetidos em qualquer stack:

1. **Cada bounded context vira um elemento isolado** (`src/modules/<contexto>`). Fronteira de contexto ⇒ proibição de dependência entre elementos (R1).
2. **Cada relação upstream → downstream vira uma permissão explícita**, e só através da Published Language do upstream (`src/contracts/<upstream>.events.ts`). O que não está no mapa é proibido (R2, R10).
3. **Cada padrão de integração do mapa restringe o canal**: o barramento in-process é o único canal, então toda forma de chamada síncrona é proibida (R8, R9, R11). O Shared Kernel e a Published Language são mínimos e não conhecem contextos (R3, R4). Só o composition root conhece todos os contextos (R5).
4. **A posse de dados acompanha o contexto**: cada model Prisma carrega o prefixo do contexto dono, e só a infraestrutura do próprio contexto toca a persistência (R6, R7).

Para que a derivação seja mecânica e não apenas narrativa, as duas configurações **leem os artefatos de design** em vez de repetir listas à mão:

- [`context-map.json`](../context-map.json): contextos, prefixo de persistência, arquivo de contrato publicado e lista de upstreams. Gera as regras R2 (as duas ferramentas) e R7 (ESLint).
- [`prisma/schema.prisma`](../prisma/schema.prisma): a lista de models. Gera os delegates e tipos proibidos em R7.

Se o mapa ganhar uma relação (por exemplo, Faturamento passar a consumir eventos da Recepção), basta acrescentar `front-desk` em `billing.upstream`. As regras mudam sozinhas.

## Tabela regra a regra

| Id | Regra | Elemento do mapa que a origina | Categorias | Ferramenta(s) | Onde está configurada |
|---|---|---|---|---|---|
| **R1** | Um contexto não importa nada de outro contexto (inclui `import type`, re-export, `require`/`import()` literal) | Bounded context como fronteira de modelo | V1, V2 (repositório alheio), V3 (injeção de service alheio), V4 (entidade alheia) | dependency-cruiser · ESLint (`boundaries/dependencies`) | `.dependency-cruiser.cjs` → `R1-no-cross-context-import`; `eslint.config.mjs` → política R1 de `boundaryPolicies` |
| **R2** | Um contexto só importa o seu próprio arquivo de contrato e os dos seus upstreams | Relações M1–M4 (Customer-Supplier + Published Language) | V1.b (relação fora do mapa) | dependency-cruiser · ESLint (`no-restricted-imports`, regex) | `R2-contracts-only-from-upstream:<contexto>` (gerada do mapa); `contextImportRules()` |
| **R3** | O `shared-kernel` não depende de contextos, contratos, infraestrutura nem do composition root | Shared Kernel mínimo | V5 | dependency-cruiser · ESLint (`boundaries/dependencies`) | `R3-shared-kernel-is-leaf`; política R3 |
| **R4** | Arquivos de `contracts/` só dependem do `shared-kernel` | Published Language autocontida | V4, V5 | dependency-cruiser · ESLint (`boundaries/dependencies` + `no-restricted-imports`) | `R4-contracts-are-self-contained`; política R4 e bloco `src/contracts/**` |
| **R5** | Só o composition root (`app.module.ts`) importa um contexto a partir de fora dele | Contextos conhecidos só pela composição | V5 | dependency-cruiser · ESLint (`boundaries/dependencies`) | `R5-no-bridge-into-context`; política R5 |
| **R6** | Só `modules/<x>/infrastructure/` toca a persistência (`src/infrastructure/prisma`, `@prisma/client`) | Posse de dados por contexto | V2 | dependency-cruiser · ESLint (`boundaries/dependencies`, só a parte local) | `R6-persistence-only-in-context-infrastructure`; política R6 |
| **R7** | Um contexto não acessa delegates Prisma (`prisma.billingInvoice`, `prisma['billingInvoice']`) nem importa tipos gerados de models de outro contexto | Posse de dados por contexto (prefixo do model) | V2 | ESLint (`no-restricted-syntax`, `no-restricted-imports`) | `contextSyntaxRules()` / `contextImportRules()` (geradas do schema) |
| **R8** | Ninguém em `src/` usa `ModuleRef` | Barramento como único canal | V3, V5 (ponte em tempo de execução) | ESLint (`no-restricted-imports`) | constante `R8` |
| **R9** | Módulos de contexto não declaram `exports` | Barramento como único canal; contextos não oferecem providers uns aos outros | V3 | ESLint (`no-restricted-syntax`) | `contextSyntaxRules()` |
| **R10** | Nomes de evento em `@OnEvent`, `emit` e `emitAsync` vêm das constantes de `contracts/`, nunca de string literal | Published Language como vocabulário único do barramento | V1.b, V3 | ESLint (`no-restricted-syntax`) | `contextSyntaxRules()` |
| **R11** | Tokens de injeção são classes ou símbolos, nunca strings | Barramento como único canal (impede resolver provider alheio sem import) | V3, V5 | ESLint (`no-restricted-syntax`) | `syntaxGuards` |
| **R12** | Sem ciclos de dependência | O mapa é acíclico (só upstream → downstream) | V1, V5 | dependency-cruiser | `R12-no-circular` |
| **R13** | `require()` e `import()` só com caminho literal | Pré-condição do método: dependências precisam ser estaticamente analisáveis | V1, V3 | ESLint (`no-restricted-syntax`) | `syntaxGuards` |


### Cobertura por categoria (antes da medição)

| Categoria | Regras que tentam cobri-la | O que fica de fora, por construção |
|---|---|---|
| V1 | R1, R2, R10, R12, R13 | `require` montado por meios que não são `require(expr)` (p.ex. `module.require`, `createRequire`) |
| V2 | R1, R6, R7 | SQL bruto com nome de tabela; delegate acessado por variável |
| V3 | R1, R8, R9, R10, R11, R13 | RPC usando o retorno de `emitAsync`; referências em `globalThis` |
| V4 | R1, R4 | Cópia estrutural de tipo; contrato com classe rica; payload inchado |
| V5 | R3, R4, R5, R8, R11, R12 | Conceito de domínio movido para o `shared-kernel` sem import |
| V6 | nenhuma | Tudo (é semântica) |

## Sobreposição entre as ferramentas

A sobreposição é intencional e é dado para a análise qualitativa: duas ferramentas com modelos diferentes (grafo de módulos resolvido vs. AST de cada arquivo) dão uma segunda opinião e expõem limitações de cada uma.

| Regra | dependency-cruiser | ESLint | Diferença observada ao configurar |
|---|---|---|---|
| R1 | ✔ (grafo resolvido, inclui tipos com `tsPreCompilationDeps`) | ✔ (`boundaries`) | Equivalentes para imports estáticos. |
| R2 | ✔ (regex de caminho resolvido) | ✔ só via `no-restricted-imports` | O `eslint-plugin-boundaries` v7 classifica elementos por **pasta**: não consegue capturar arquivos individuais (`contracts/<publicador>.events.ts`), então R2 não pôde ser escrita nele. No ESLint, R2 casa a **string** do import, não o arquivo resolvido. |
| R3, R5 | ✔ | ✔ | O `boundaries` só vê arquivos dentro de elementos conhecidos. Um arquivo solto em `src/` (fora de pastas) é "desconhecido" e não é checado: só o dependency-cruiser pega uma ponte criada em `src/foo.ts`. Pastas novas (`src/common/`) são cobertas pelo elemento coringa `other`. |
| R4 | ✔ (qualquer destino fora do `shared-kernel`, inclusive pacotes npm) | ✔ (por string de import) | O dependency-cruiser também proíbe pacotes externos em contratos; o ESLint só caminhos locais. |
| R6 | ✔ (inclui `@prisma/client`) | ✔ (só `src/infrastructure/prisma`) | O `boundaries` não foi configurado para módulos externos. |
| R12 | ✔ | ✘ | Ciclos são uma propriedade do grafo, não de um arquivo. |
| R7–R11, R13 | ✘ | ✔ | Padrões sintáticos: o grafo de módulos não os enxerga. |

## Como executar

```bash
npm run check:arch        # gate: dependency-cruiser + ESLint em paralelo; exit code ≠ 0 se houver violação
npm run arch:graph:contexts  # grafo por camada em docs/grafo-de-contextos.md
npm run arch:graph           # grafo por arquivo em docs/grafo-de-dependencias.md
```

O `scripts/check-arch.mjs` normaliza a saída das duas ferramentas pelo id da regra (as mensagens do ESLint carregam `[Rn]`; os nomes das regras do dependency-cruiser começam com `Rn-`). Violações de estilo do ESLint que não são de arquitetura ficam para `npm run lint`. Com `--json <arquivo>`, o gate grava a lista de violações, as regras disparadas e os tempos. É isso que a avaliação semeada consome.

Grafos gerados: [por camada](grafo-de-contextos.md) · [por arquivo](grafo-de-dependencias.md).
