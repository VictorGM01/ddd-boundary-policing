# Taxonomia de violações arquiteturais

Este documento foi escrito **antes** das regras de policiamento ([regras.md](regras.md)). Ele define o que conta como violação das fronteiras do [mapa de contextos](mapa-de-contextos.md), independentemente de alguma ferramenta conseguir detectar. As regras são avaliadas contra esta taxonomia, e não o contrário. É isso que evita a tautologia "a regra pega a violação que a regra descreve" (ver *Lacuna de pesquisa*, camada 3).

Para cada categoria há: definição, por que ela fere o mapa, variantes concretas, exemplo de código e a expectativa de detecção estática (total, parcial ou nenhuma) com justificativa. As expectativas são hipóteses; o resultado medido está em `experiments/seeded/results/summary.md`.

Convenções: `X` e `Y` são contextos distintos; caminhos relativos a `src/`.

---

## V1 — Dependência direta entre contextos

**Definição.** Código de um contexto `X` referencia, em tempo de compilação ou de carga, um artefato que pertence a outro contexto `Y` (classe, função, constante, tipo, módulo Nest), por qualquer forma de import. Também conta como V1 a dependência de `X` sobre a Published Language de um contexto `Y` que **não** é upstream de `X` no mapa (relação não prevista no mapa, sub-categoria **V1.b**).

**Por que fere o mapa.** O mapa declara que contextos só se conhecem pelos eventos das relações M1–M4. Um import direto cria um canal fora do barramento. Uma relação fora do mapa (V1.b) cria um acoplamento que o design estratégico não autorizou.

**Variantes.**

- import relativo (`../../billing/domain/invoice`);
- import por alias (`@/modules/billing/domain/invoice`);
- import somente de tipo (`import type`);
- re-export por barrel (um `index.ts` de `X` que reexporta algo de `Y`);
- `require()` ou `import()` dinâmico com caminho literal;
- `require()` com caminho calculado em tempo de execução;
- V1.b: importar `contracts/clinical.events.ts` dentro de `scheduling`, ou ouvir um evento de um contexto não upstream usando o nome literal do evento.

```ts
// src/modules/clinical/application/complete-encounter.service.ts
import { PriceList } from '../../billing/domain/price-list'; // V1
import type { Invoice } from '@/modules/billing/domain/invoice'; // V1 (só tipo)

// src/modules/scheduling/application/whatever.listener.ts
@OnEvent('clinical.encounter-completed') // V1.b: Agendamento não é downstream do Clínico
```

**Expectativa de detecção: parcial (quase total).** Imports estáticos, inclusive de tipo, re-exports e `require`/`import()` com string literal aparecem no grafo de dependências. `require` com caminho calculado não aparece: o analisador não resolve strings em tempo de execução. V1.b por import de contrato é detectável se as regras forem derivadas das relações do mapa. Por nome literal de evento, só é detectável se houver uma regra sintática que obrigue o uso das constantes dos contratos.

---

## V2 — Acesso à persistência de outro contexto

**Definição.** Código de `X` lê ou escreve dados que pertencem a `Y`: usa o repositório de `Y`, os models/delegates Prisma de `Y` (`prisma.billingInvoice`), os tipos gerados de `Y` (`import { BillingInvoice } from '@prisma/client'`) ou consulta as tabelas de `Y` via SQL. Também conta como V2 a camada de domínio, aplicação ou API de `X` acessar a persistência diretamente, sem passar pela própria infraestrutura (isso abre a porta para o acesso cruzado).

**Por que fere o mapa.** Cada contexto é dono dos seus dados (separação lógica por contexto no mesmo banco). Ler a tabela de outro contexto é uma integração por banco compartilhado que contorna o barramento e acopla os esquemas.

**Variantes.**

- importar o repositório de `Y` (também é V1);
- usar o delegate Prisma de `Y` pelo `PrismaService` técnico (sem import de `Y`);
- acesso computado (`prisma['billingInvoice']` ou `prisma[nome]`);
- importar o tipo gerado do model de `Y` de `@prisma/client`;
- SQL bruto (`$queryRawUnsafe('SELECT * FROM BillingInvoice')`);
- `domain/` ou `application/` de `X` importando o `PrismaService`.

```ts
// src/modules/clinical/infrastructure/prisma-encounter.repository.ts
const invoices = await this.prisma.billingInvoice.findMany(); // V2: delegate de Faturamento
const rows = await this.prisma.$queryRawUnsafe('SELECT * FROM "BillingInvoice"'); // V2 via SQL
```

**Expectativa de detecção: parcial.** O `PrismaService` é compartilhado por razões técnicas, então o grafo de imports não distingue "usar o próprio model" de "usar o model alheio". Uma regra sintática sobre os nomes dos delegates (derivados do `schema.prisma` pelo prefixo de contexto) pega o acesso direto e o computado com literal. Acesso computado com variável e SQL bruto passam: o nome da tabela é só uma string.

---

## V3 — Chamada síncrona entre módulos

**Definição.** `X` invoca comportamento de `Y` de forma síncrona (pedido/resposta), por qualquer mecanismo que não seja publicar um evento e esquecer: injetar um provider de `Y`, resolver um provider de `Y` com `ModuleRef.get`, importar o módulo Nest de `Y` em `X`, exportar providers de um módulo de contexto para outro, ou usar o próprio barramento como RPC (ler o valor de retorno de `emitAsync`).

**Por que fere o mapa.** O mapa declara o barramento in-process, com semântica de evento, como o único canal legítimo. Uma chamada síncrona cria dependência temporal (o chamador espera o chamado) e acoplamento de comportamento.

**Variantes.**

- injeção de um service de `Y` pelo construtor (exige import, também é V1);
- `ModuleRef.get(Token, { strict: false })`, com token de classe ou string;
- `@Inject('BILLING_SERVICE')` com token string registrado por outro contexto;
- `exports: [...]` no `@Module` de um contexto e `imports: [OutroModule]` no consumidor;
- RPC pelo barramento: `const [preço] = await events.emitAsync(...)`;
- referência guardada em `globalThis`.

```ts
// src/modules/clinical/application/complete-encounter.service.ts
constructor(private readonly moduleRef: ModuleRef) {}
const invoices = this.moduleRef.get('BillingInvoiceService', { strict: false }); // V3
const [price] = await this.events.emitAsync('billing.price-requested', codes); // V3 via barramento
```

**Expectativa de detecção: parcial.** Tudo que exige import de `Y` cai em V1 e é detectado. `ModuleRef`, `exports` em módulo de contexto e tokens string são padrões sintáticos e podem ser proibidos por regra. RPC pelo barramento e `globalThis` não deixam rastro estrutural que diferencie o uso legítimo do ilegítimo.

---

## V4 — Vazamento de modelo por tipos compartilhados

**Definição.** Uma entidade, value object ou tipo de domínio de um contexto passa a ser usado como modelo em outro contexto, seja importado diretamente, seja transportado por um contrato mal usado: um payload de evento que referencia a entidade do publicador, um contrato que define uma classe com comportamento, ou um contrato que expõe o modelo interno inteiro em vez de um payload mínimo.

**Por que fere o mapa.** Published Language é um vocabulário mínimo e estável, não o modelo interno. Quando o modelo vaza, o downstream passa a depender da forma interna do upstream, e qualquer refatoração interna se torna mudança de contrato.

**Variantes.**

- `X` importa a entidade de `Y` só como tipo (também é V1);
- `contracts/clinical.events.ts` importa `Encounter` de `modules/clinical`;
- contrato que importa outro contrato (Published Languages de dois publicadores acopladas);
- contrato com classe com métodos de domínio;
- payload que copia estruturalmente o modelo interno inteiro (inclusive diagnósticos);
- tipo de domínio duplicado à mão em outro contexto.

```ts
// src/contracts/clinical.events.ts
import { Encounter } from '../modules/clinical/domain/encounter'; // V4
export interface EncounterCompleted extends IntegrationEvent { encounter: Encounter }
```

**Expectativa de detecção: parcial.** Imports de modelo, a partir de contextos ou de `contracts/`, são detectáveis. Cópia estrutural, classe rica dentro do contrato e payload inchado não têm assinatura sintática distinta de um contrato legítimo.

---

## V5 — Dependência transitiva via camada comum

**Definição.** Uma camada que deveria ser neutra (`shared-kernel`, `contracts`, `infrastructure`, ou uma pasta nova como `common/`) passa a conhecer um contexto e serve de ponte, fazendo com que `X` dependa de `Y` sem nenhum import direto entre eles.

**Por que fere o mapa.** O Shared Kernel é deliberadamente mínimo e não conhece contextos. Uma camada comum que importa contextos reintroduz o acoplamento por um caminho indireto e, com frequência, cria ciclos.

**Variantes.**

- `shared-kernel` importando de `modules/`;
- `shared-kernel` reexportando algo de um contexto;
- nova pasta `src/common/` que importa `billing` e é usada por `clinical`;
- `src/infrastructure/` importando um contexto;
- ponte em tempo de execução: módulo global em `common/` que resolve um provider de contexto por string;
- conceito de domínio de um contexto colocado no `shared-kernel` (sem import).

```ts
// src/shared-kernel/billing-helpers.ts
export { PriceList } from '../modules/billing/domain/price-list'; // V5
// src/modules/clinical/... importa '@/shared-kernel/billing-helpers'
```

**Expectativa de detecção: total para pontes por import, nenhuma para pontes semânticas.** Qualquer import de um contexto a partir de fora dele, exceto do composition root (`app.module.ts`), é detectável. Mover um conceito de domínio para o `shared-kernel` sem import é decisão de modelagem e não aparece no grafo.

---

## V6 — Vazamento semântico de Linguagem Ubíqua

**Definição.** Um contexto passa a modelar um conceito com o termo, o papel ou as regras de outro contexto, sem nenhuma dependência de código: uma classe `Patient` dentro de `billing`, um campo `diagnosisCodes` numa fatura, uma regra clínica reimplementada no Faturamento, ou o Agendamento falando em "paciente".

**Por que fere o mapa.** O bounded context é a fronteira de validade de um modelo e da sua linguagem. Se o Faturamento passa a falar de Paciente, o modelo do Clínico vazou, ainda que por cópia.

```ts
// src/modules/billing/domain/patient.ts
export class Patient { constructor(readonly personId: string, readonly allergies: string[]) {} } // V6
```

**Expectativa de detecção: nenhuma, por definição.** Não há dependência estrutural; o vazamento está no significado. Esta categoria existe para medir falsos negativos da camada estática e serve de alvo para a camada semântica com LLM (E2), que recebe o glossário de [linguagem-ubiqua.md](linguagem-ubiqua.md).

---

## Resumo das expectativas

| Categoria | Expectativa | Limite principal |
|---|---|---|
| V1 | Parcial (quase total) | `require` com caminho calculado |
| V2 | Parcial | SQL bruto, acesso computado por variável |
| V3 | Parcial | RPC pelo barramento, `globalThis` |
| V4 | Parcial | Cópia estrutural, contrato inchado ou com comportamento |
| V5 | Total (por import) / nenhuma (semântica) | Conceito movido para o `shared-kernel` sem import |
| V6 | Nenhuma | Fora do alcance da análise estática |

## Casos de controle (não são violações)

Para medir falsos positivos, a avaliação inclui mudanças legítimas que não devem disparar nada: funcionalidade nova dentro de um contexto, evento novo em `contracts/` consumido por um downstream previsto no mapa, refatoração interna, novo model Prisma com o prefixo do próprio contexto, nova primitiva no `shared-kernel`, nomes de arquivo ou campos que mencionam outro contexto sem depender dele.
