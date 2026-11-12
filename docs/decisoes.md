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

## ADR-016 · Achados da avaliação semeada mantidos durante o E1

- **Contexto.** A avaliação semeada deixou dois achados sobre as regras: (a) a R12 (sem ciclos) nunca disparou, porque todo ciclo entre contextos passa por um import que a R1 já proíbe, ou seja, a R1 subsume a R12 no desenho atual; (b) o falso positivo de `c-09`, em que a versão ESLint da R2 casa qualquer pasta chamada `contracts/` pelo nome (ADR-013).
- **Decisão.** Nenhum dos dois é corrigido antes ou durante o E1. As regras ficam congeladas na tag `e1-baseline`.
- **Consequência.** Os dois entram no relatório como achados. Se um agente criar uma pasta `contracts/` interna a um contexto, o E1 pode reproduzir o falso positivo de `c-09` com código real; a R12 continua candidata a ser removida ou mantida só como rede de segurança para pastas fora dos contextos.

## ADR-017 · Cópia do agente sem nenhum artefato que revele as regras

- **Contexto.** O ADR-014 previa remover só `docs/`, `experiments/` e o `README.md`. A cópia ainda revelaria as regras: `context-map.json`, `.dependency-cruiser.cjs`, as mensagens `[Rn]` do `eslint.config.mjs`, o próprio gate e o workflow de CI que o chama. Com isso, o braço A teria acesso a uma versão das regras e a diferença entre os braços deixaria de ser só o `agent-rules.md`.
- **Decisão.** Nos braços A e B, o harness (`scripts/e1/lib.mjs`) remove também `context-map.json`, `.dependency-cruiser.cjs`, `scripts/check-arch.mjs`, `scripts/eval-seeded.mjs`, `scripts/wrap-mermaid.mjs`, `.github/` e os scripts `check:arch`, `eval:seeded` e `arch:graph*` do `package.json`, e troca o `eslint.config.mjs` por uma versão só de estilo/TypeScript (`scripts/e1/templates/eslint.config.style.mjs`). Uma varredura por padrões (`check:arch`, `context-map`, `[Rn]`, `taxonom`, `agent-rules`…) roda em toda cópia e aborta a execução se encontrar algo. Depois que o agente termina, o harness restaura esses arquivos e roda o gate de fora. No braço C, a cópia mantém o gate. As variantes de `agent-rules.md` são geradas no harness: a frase "`npm run check:arch` must pass before you finish" só existe no braço C, e no braço B a instrução de declarar relações novas em `context-map.json` diz que o arquivo pode ser criado (porque ele não existe na cópia) e qual é o formato.
- **Mapa declarado pelo agente.** Se o agente cria ou altera um `context-map.json`, o harness incorpora as relações e os contratos novos ao mapa do baseline antes de rodar o gate, e registra isso em `meta.json` (`restoreNotes`). É o que aconteceria no método real: declarar a relação no mapa muda as regras. No braço A, o agente não tem como saber do mapa; uma relação nova não declarada aparece como R2 no gate e é rotulada como `V1.b-undeclared-relation` no ground truth (ver protocolo, análise de sensibilidade).
- **O que continua visível.** Os nomes `dependency-cruiser` e `eslint-plugin-boundaries` seguem nas `devDependencies` do `package.json` (removê-los faria um `npm install` do agente apagar os pacotes de que o gate precisa). Eles revelam a existência de ferramentas, não as regras. A estrutura de pastas por contexto, os contratos em `src/contracts/` e o código existente, que já usa só eventos, são parte do protótipo e aparecem nos dois braços.
- **Consequência.** Substitui a consequência do ADR-014 (que admitia o mapa e as configurações na cópia do braço A). O ADR-007 continua válido para o repositório; só a cópia do agente muda.

## ADR-018 · Isolamento do agente sem container

- **Contexto.** O agente precisa rodar sem confirmações (`bypassPermissions`), sem herdar nada desta sessão nem da configuração pessoal do aluno, e com o login da assinatura. O Docker (OrbStack) está disponível, mas o login do Claude Code fica no Keychain do macOS, que um container Linux não lê; levar a credencial para dentro do container exigiria gerar um token de longa duração ou copiar credenciais, o que está fora do que esta sessão pode fazer sem o aluno.
- **Decisão.** Sem container. Cada execução é um processo `claude -p` separado, com: cópia em `$TMPDIR/e1-runs/` (fora de qualquer projeto, sem `CLAUDE.md` de diretório pai), `git init` sem remote, ambiente de processo limpo (só `HOME`, `USER`, `PATH`, `TMPDIR`, `LANG`, `SHELL`, `TERM`; nenhuma variável `CLAUDE_*` ou `ANTHROPIC_*` desta sessão), `--setting-sources project` (ignora `~/.claude/settings.json`, plugins e hooks do usuário), `--disable-slash-commands` (desativa as skills de `~/.claude/skills`, que incluem uma skill de DDD), `--strict-mcp-config` com configuração vazia, `--no-session-persistence` e `--permission-mode bypassPermissions`. Não existe `~/.claude/CLAUDE.md`. O evento `init` de cada transcrição registra skills, MCP e plugins carregados, e o harness alerta se algum aparecer. O estado por diretório que o Claude Code cria em `~/.claude/projects/` para a cópia é apagado no fim de cada execução.
- **Risco.** Sem container, o agente roda com as permissões do usuário no Mac e poderia ler ou escrever fora da cópia (por exemplo, encontrar o repositório original e os documentos das regras). O harness procura caminhos fora da cópia nas chamadas de ferramenta da transcrição e lista os casos nos pontos de atenção do `FINISHED.md`.
- **Consequência.** O isolamento é por configuração e por diretório, não por sistema operacional. Os plugins embutidos do Claude Code (`builtin`) carregam igualmente em todos os braços.

## ADR-019 · Modelo, esforço e limites fixos do agente

- **Decisão.** `--model claude-sonnet-5-5` (id conferido no evento `init` de uma chamada de teste com o Claude Code 2.1.285), `--effort high`, `--max-turns 40`, timeout de 20 minutos por execução. Ferramentas `WebFetch`, `WebSearch` e as de automação que não têm relação com a tarefa (`RemoteTrigger`, `PushNotification`, `CronCreate`, `ScheduleWakeup`, `Workflow`, `DesignSync`) ficam desativadas em todos os braços.
- **Justificativa.** O Sonnet é o modelo mais usado no dia a dia em agentes de código, então representa melhor o cenário real, e consome menos do limite de uso da assinatura. O esforço é fixado explicitamente para que uma mudança de padrão do Claude Code não altere o experimento no meio; `high` é o que o aluno usa na própria configuração. Sem acesso à web, o agente não pode buscar material de DDD que um braço receberia e o outro não por acaso.
- **Consequência.** Os resultados valem para esse modelo e essa configuração. A sessão orquestradora usa outro modelo e não participa como agente do experimento.

## ADR-020 · Testes de aceite ocultos só pela interface pública

- **Decisão.** Um teste por tarefa em `experiments/e1/acceptance/`, só com rotas, payloads, status e nomes de erro do enunciado e do baseline. Cada teste foi validado contra uma implementação de referência feita numa cópia descartável (passou 3 vezes seguidas em todas as tarefas) e contra o baseline sem a funcionalidade (o teste principal de cada tarefa falha). A implementação de referência foi apagada e não entra no repositório. O teste entra na cópia só depois que o agente termina, com banco próprio (`prisma/acceptance.db`).
- **Limitações registradas antes das execuções.** T2: o enunciado não diz quais códigos de medicamento o Faturamento precifica, então o teste não verifica o valor de uma linha de prescrição precificada; verifica o endpoint e que um código sem preço não impede as demais linhas. T4: não há interface de pagamento, então "fatura paga" não é testada. T3 e T6: o formato da resposta não é fixado; o teste procura a entrada de cada profissional e aceita contagem com valor em centavos ou em reais (T3), e milissegundos, segundos ou minutos, com média sobre atendidos ou sobre todos (T6). Critérios arquiteturais ficam para a classificação manual.
- **Consequência.** "Aceite completo" é uma medida de sucesso funcional mínima, não de correção total. Em T2, uma implementação que aceita a prescrição e não fatura nada passa no aceite; isso é observado na rotulagem.

## ADR-021 · Ordem em blocos de replicação e ambiente de energia

- **Contexto.** O preflight encontrou o Mac na bateria (50%, cerca de 4 h de autonomia) e o disco com 4 GiB livres. O `caffeinate -s` só impede o repouso na tomada; se a bateria acabar, o plano para no meio.
- **Decisão.** A ordem das execuções é aleatorizada dentro de blocos de replicação (cada bloco cobre as 12 células tarefa × braço uma vez), em vez de uma permutação única das 36 execuções. As cópias usam clone APFS (`cp -c`), que quase não ocupa espaço novo, e são apagadas ao fim de cada execução.
- **Consequência.** Um plano interrompido deixa repetições completas de todas as células, sem desequilibrar os braços. A aleatorização protege contra efeitos de ordem dentro de cada bloco, não entre blocos (o bloco 1 roda sempre antes do 2). Bateria e disco entram nos pontos de atenção do `FINISHED.md`.

## ADR-022 · Rotulagem cega feita por subagentes sem contexto do experimento

- **Contexto.** A sessão orquestradora conhece o braço e a tarefa de cada execução e escreveu as regras; rotular os diffs nela mesma comprometeria a cegueira.
- **Decisão.** Os diffs de `blind/` são rotulados por subagentes novos que recebem só os arquivos `blind/<id>.patch`, a taxonomia, o mapa de contextos e a linguagem ubíqua, sem o mapeamento, sem a saída do gate e sem saber que há braços. Eles gravam as linhas de `blind/labels.csv`. O cruzamento com o gate é feito por script depois.
- **Consequência.** A cegueira é melhor do que a de um rotulador que conhece o desenho, mas o rótulo continua sendo de um modelo de linguagem, não de humanos (ameaça registrada no summary, com amostra para revisão humana).
