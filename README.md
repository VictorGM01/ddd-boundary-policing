# ddd-boundary-policing

Policiamento arquitetural para bounded contexts do DDD num monólito modular em TypeScript: regras de análise estática derivadas do mapa de contextos, barramento de eventos in-process como único canal entre contextos, e um experimento com agentes de IA como fonte de erosão.

Projeto de Iniciação Científica do **Inteli (Instituto de Tecnologia e Liderança)**.
Aluno: **Victor Gabriel Marques** · Orientador: **José Romualdo da Costa Filho**.

## O problema

Num monólito modular as fronteiras entre módulos são lógicas: nada impede uma classe do Faturamento de importar o repositório do Clínico. Sem a barreira física da rede, a arquitetura erode em silêncio. O risco cresce com os agentes de codificação por IA, que produzem muito código sem supervisão direta e tendem a acoplar. As ferramentas de verificação de dependências existem (dependency-cruiser, eslint-plugin-boundaries, ArchUnit, Spring Modulith), mas falta um **método** que diga de onde as regras vêm e uma validação que não seja tautológica.

## O método em 3 pilares

1. **Design estratégico (DDD).** Um [mapa de contextos](docs/mapa-de-contextos.md) explícito, com relações upstream/downstream, e uma [taxonomia de violações](docs/taxonomia.md) definida antes das regras.
2. **Comunicação por eventos in-process.** Contextos só se falam por eventos de integração tipados (`@nestjs/event-emitter`), cujos contratos formam a Published Language em `src/contracts/`.
3. **Policiamento estático no CI.** [Regras](docs/regras.md) derivadas do mapa, uma a uma, implementadas com dependency-cruiser e ESLint e executadas como quality gate obrigatório. As configurações leem [`context-map.json`](context-map.json) e o `schema.prisma`, então mudar o mapa muda as regras.

A validação tem duas etapas: uma avaliação com **violações semeadas** (pronta, ver abaixo) e o experimento **E1**, em que um agente de IA implementa funcionalidades com e sem as regras no contexto (próxima etapa).

## Estudo de caso

Clínica médica particular com quatro contextos: Agendamento (`scheduling`), Recepção (`front-desk`), Clínico (`clinical`) e Faturamento (`billing`). A Pessoa tem um modelo diferente em cada um (Solicitante, Visitante, Paciente, Pagador); os contextos compartilham só o `personId`.

```
agendar ─▶ AppointmentScheduled ─▶ Recepção espera a visita
check-in ─▶ VisitorCheckedIn ─▶ Clínico abre o atendimento
concluir ─▶ EncounterCompleted ─▶ Faturamento emite a fatura
no-show ─▶ AppointmentNoShow ─▶ Faturamento cobra a taxa
```

## Estrutura do repositório

```
src/
  main.ts, app.module.ts      composition root (único lugar que conhece todos os contextos)
  shared-kernel/              primitivas: ids, IntegrationEvent, Clock, DomainError
  contracts/                  Published Language: um arquivo de eventos por contexto publicador
  modules/<contexto>/         domain/ application/ infrastructure/ api/ <contexto>.module.ts
  infrastructure/             PrismaService e filtro HTTP (técnicos)
prisma/schema.prisma          models com prefixo do contexto dono
context-map.json              mapa de contextos legível por máquina (fonte das regras)
.dependency-cruiser.cjs       regras R1–R6, R12
eslint.config.mjs             regras R1–R11, R13 (boundaries + sintáticas)
scripts/check-arch.mjs        gate: as duas ferramentas, saída por id de regra
scripts/eval-seeded.mjs       avaliação com violações semeadas
test/                         e2e do fluxo completo
docs/                         modelagem, regras e decisões
experiments/seeded/           casos semeados e resultados
experiments/e1/               preparação do E1 (regras do braço B, backlog)
```

## Como rodar

Requer Node 20+ e npm. Não precisa de Docker (SQLite, ver [ADR-001](docs/decisoes.md)).

```bash
npm i
```

```bash
npx prisma generate
```

```bash
npm run check:arch
```

```bash
npm test
```

```bash
npm run eval:seeded
```

Outros comandos: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run arch:graph:contexts` (grafo por camada em Mermaid). Para subir a API localmente: copie `.env.example` para `.env`, rode `npm run db:push` e depois `npm run start:dev`.

## Documentação

- [Mapa de contextos](docs/mapa-de-contextos.md): contextos, relações, eventos, diagramas
- [Linguagem ubíqua](docs/linguagem-ubiqua.md): glossário por contexto e o papel da Pessoa em cada um
- [Taxonomia de violações](docs/taxonomia.md): V1–V6, definidas antes das regras, com expectativa de detecção
- [Regras de policiamento](docs/regras.md): regra a regra, com origem no mapa, categorias cobertas e ferramenta
- [Decisões](docs/decisoes.md): ADRs curtos
- Grafos gerados: [por camada](docs/grafo-de-contextos.md) · [por arquivo](docs/grafo-de-dependencias.md)
- [Avaliação semeada](experiments/seeded/README.md) · [resultados](experiments/seeded/results/summary.md)
- [Preparação do E1](experiments/e1/README.md)

## Estado atual

Pronto:

- OE2: mapa de contextos, linguagem ubíqua e taxonomia
- OE3: protótipo NestJS com 4 contextos, comunicação só por eventos, testes unitários de domínio e e2e do fluxo completo
- OE4: 13 regras em duas ferramentas, gate `check:arch` e CI
- Avaliação semeada: 52 casos (42 violações em V1–V6 e 10 controles legítimos). Revocação de 71,1% no escopo estático (V1–V5) e 0% em V6, como esperado; precisão de 96,4%; gate em cerca de 0,5 s por execução. Detalhes em [summary.md](experiments/seeded/results/summary.md).

Próximas etapas:

- **E1:** harness do agente de IA nos braços A (sem regras) e B (com [agent-rules.md](experiments/e1/agent-rules.md)), sobre o [backlog](experiments/e1/backlog.md)
- **E2 (condicional):** revisão semântica por LLM com o glossário, mirando os falsos negativos (V4 por forma, V6, RPC pelo barramento)
- Avaliação do ArchLintor quando estiver disponível ([ADR-010](docs/decisoes.md))

## Licença

[MIT](LICENSE) © 2026 Victor Gabriel Marques
