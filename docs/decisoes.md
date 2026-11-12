# Registro de decisões (ADRs curtos)

Decisões tomadas durante a implementação de OE2–OE4 e da avaliação semeada. Formato: contexto → decisão → consequência. Decisões que mudam regras depois de ver resultados ficam marcadas como tal.

## ADR-001 · SQLite no lugar de PostgreSQL

- **Contexto.** A proposta cita Prisma com PostgreSQL. O CI, o teste e2e e, no futuro, o harness do E1 (muitas execuções paralelas do agente) precisariam de Docker ou de um serviço de banco.
- **Decisão.** Prisma com SQLite (arquivo local). A separação lógica de dados por contexto é mantida pelo prefixo dos models (`SchedulingAppointment`, `BillingInvoice`…), que é o que as regras R6/R7 verificam.
- **Consequência.** Sem `enum` nem listas escalares no schema (status são `String`, listas de códigos são JSON em `String`). Trocar para PostgreSQL é mudar o `provider` e gerar migrações; nada nas regras depende do banco.

## ADR-002 · Prisma 6, não 7

- **Contexto.** O Prisma 7 exige `prisma.config.ts` e driver adapters.
- **Decisão.** Fixar `prisma`/`@prisma/client` em `^6.19`.
- **Consequência.** Menos peças móveis no protótipo e no harness. Migrar é um passo isolado.

## ADR-003 · dependency-cruiser 17

- **Contexto.** O dependency-cruiser 18 exige Node ≥ 22; o requisito do projeto é Node 20+.
- **Decisão.** Usar `dependency-cruiser@17.4.3` (Node `^20.12 || ^22 || >=24`). O CI roda nas versões 20 e 22.
- **Consequência.** Nenhuma regra usada depende de recursos da v18.

## ADR-004 · `VisitorCheckedIn` em vez de `PatientCheckedIn`

- **Contexto.** O roteiro sugeria que a Recepção publicasse `PatientCheckedIn`.
- **Decisão.** O evento se chama `VisitorCheckedIn`. Na Linguagem Ubíqua da Recepção a pessoa é Visitante; quem a trata como Paciente é o Clínico, ao consumir o evento (ACL no listener).
- **Consequência.** O próprio contrato demonstra o ponto central do estudo de caso (Pessoa com papéis distintos por contexto). Um evento `PatientCheckedIn` publicado pela Recepção já seria um pequeno vazamento V6.

## ADR-005 · Sub-categoria V1.b (relação fora do mapa)

- **Contexto.** Importar a Published Language de um contexto que não é upstream não é "import direto entre contextos", mas cria uma relação que o mapa não autoriza.
- **Decisão.** Tratar como V1.b dentro de V1, definida na taxonomia antes das regras.
- **Consequência.** R2 e R10 cobrem V1.b. A taxonomia mantém as seis categorias pedidas.

## ADR-006 · Contexto só importa contratos do próprio contexto e dos upstreams

- **Contexto.** A alternativa mais simples seria permitir qualquer arquivo de `contracts/`.
- **Decisão.** Restringir aos upstreams declarados no mapa. É a regra que mais diretamente transforma uma relação do mapa (M1–M4) em restrição verificável.
- **Consequência.** Adicionar uma relação exige editar `context-map.json`. Isso é desejável, porque força a decisão estratégica a ser explícita.

## ADR-007 · Mapa de contextos legível por máquina

- **Decisão.** `context-map.json` na raiz (contextos, prefixo de persistência, contrato publicado, upstreams). `.dependency-cruiser.cjs` e `eslint.config.mjs` geram R2 e R7 a partir dele e de `prisma/schema.prisma`.
- **Consequência.** A derivação regra ← mapa é executável, não só documentada. O arquivo fica fora de `docs/` porque o gate precisa dele mesmo na cópia do braço A do E1 (ver ADR-014).

## ADR-008 · Limitações do eslint-plugin-boundaries v7

- **Contexto.** O plugin v7 classifica *elementos* por pasta. Padrões de arquivo (`src/contracts/*.events.ts`) geram aviso e não produzem capturas utilizáveis. As mensagens customizadas não têm helpers Handlebars (`eq`). Arquivos fora de elementos conhecidos não são checados.
- **Decisão.** (a) Contratos como um único elemento-pasta; R2 e a parte "contrato → contrato" de R4 implementadas no ESLint com `no-restricted-imports` + regex. (b) Uma política `disallow` por regra, com mensagem fixa `[Rn]`, e `default: allow` (a última política que casa vence). (c) Elemento coringa `other` (`src/*`) para que pastas novas como `src/common/` sejam checadas.
- **Consequência.** Arquivos soltos na raiz de `src/` só são cobertos pelo dependency-cruiser. A versão ESLint de R2 casa a string do import, não o arquivo resolvido; isso produziu o falso positivo `c-09` (ver ADR-013).

## ADR-009 · Barramento síncrono, sem outbox

- **Decisão.** Publicação com `EventEmitter2.emitAsync` aguardado; listeners `@OnEvent` padrão. O teste e2e é determinístico sem `sleep`.
- **Consequência.** Erros de listener são suprimidos e logados pelo `@nestjs/event-emitter` (`suppressErrors`), então uma falha no Faturamento não derruba a requisição do Clínico. Não há garantia de entrega (outbox, retry); isso está fora do escopo do método.

## ADR-010 · ArchLintor não avaliado

- **Contexto.** A proposta prevê avaliar o ArchLintor (Resende, Durelli e Terra, SBES 2025) como terceiro verificador.
- **Decisão.** Não incluído: não há pacote `archlintor` no npm, e uma busca não encontrou repositório público em 12/11/2026. Só o artigo está disponível.
- **Consequência.** Fica como trabalho futuro. O gate aceita um terceiro verificador sem mudança no formato: basta normalizar a saída por id de regra em `scripts/check-arch.mjs`.

## ADR-011 · R13 (caminhos analisáveis) incluída; RPC pelo barramento sem regra

- **Decisão.** R13 proíbe `require`/`import()` com caminho não literal: é uma pré-condição do próprio método. Já o uso do retorno de `emitAsync` como RPC (V3) **não** recebeu regra. A taxonomia o previu como não detectável, e uma regra sintática ("proibir usar o retorno de `emitAsync`") seria escrita sob medida para o caso semeado, o que reintroduziria a tautologia que o experimento quer evitar.
- **Consequência.** `v3-06` é um falso negativo assumido e alvo natural do E2.

## ADR-012 · Banco do e2e recriado sem `--force-reset`

- **Contexto.** O Prisma 6.19 recusa `db push --force-reset` quando detecta execução por agente de IA.
- **Decisão.** O `globalSetup` apaga o arquivo SQLite descartável (`prisma/e2e.db`) e roda `prisma db push`.
- **Consequência.** O mesmo efeito, sem contornar a proteção.

## ADR-013 · Falso positivo de R2 mantido (decisão após ver resultados)

- **Contexto.** Na primeira execução da avaliação semeada, `c-09-insurance-contracts-folder` (pasta `domain/contracts/` interna ao Faturamento) disparou R2 no ESLint. O dependency-cruiser não disparou.
- **Decisão.** A regra **não** foi alterada. O falso positivo é resultado: decorre da limitação do ADR-008. A correção candidata, para uma rodada futura e reportada à parte, é ancorar a regex em `^@/contracts/` e em relativos que sobem até `src/` (`^(\.\./){2,}contracts/` a partir de `src/modules/<x>/<camada>/`).
- **Consequência.** O summary reporta precisão de 96,4% e especificidade de 90% nos controles com a regra original.

## ADR-014 · Preparação para o E1

- **Decisão.** Nenhum arquivo carregado automaticamente por agentes na raiz (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.github/copilot-instructions.md`…). Toda a documentação de arquitetura fica em `docs/` e `experiments/`, que o harness remove da cópia do braço A. Comentários no código não explicam as regras.
- **Consequência.** No braço A, o agente ainda vê `context-map.json`, `.dependency-cruiser.cjs`, `eslint.config.mjs` e, se rodar o gate, as mensagens `[Rn]`. Isso é o mínimo para o CI existir; o que distingue os braços é o arquivo `experiments/e1/agent-rules.md` no contexto do agente. O harness deve registrar se o agente executou `check:arch` por conta própria.

## ADR-015 · Alias `@/` e build

- **Decisão.** Alias `@/*` → `src/*` (tsconfig, Jest e resolvers das duas ferramentas). O `nest build` reescreve os aliases para caminhos relativos no JavaScript gerado.
- **Consequência.** A avaliação inclui variantes com alias e com caminho relativo para cada tipo de import.
