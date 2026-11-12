# Experimento E1: preparação

O harness do E1 **ainda não está implementado**. Esta pasta contém apenas o que ele vai consumir:

- [agent-rules.md](agent-rules.md): regras em linguagem natural, entregues ao agente **somente no braço B**. Derivadas de [docs/regras.md](../../docs/regras.md), com os mesmos ids.
- [backlog.md](backlog.md): tarefas candidatas, com critérios de aceite e a violação mais provável de cada uma.

## Contrato com o harness

1. Copiar o repositório para um diretório limpo por execução.
2. **Braço A:** remover `docs/`, `experiments/` e `README.md` da cópia. Não há na raiz arquivos carregados automaticamente por agentes (ADR-014).
3. **Braço B:** igual ao A, mais `agent-rules.md` no contexto do agente (via prompt ou arquivo de instruções criado só nessa cópia).
4. Entregar o enunciado em inglês da tarefa, igual nos dois braços.
5. Ao final, executar `node scripts/check-arch.mjs --json <saida>`, os testes de aceite da tarefa e `npm test`. Registrar modelo, versão, custo, duração e se o agente executou o gate por conta própria.
6. Classificar manualmente cada violação encontrada (inclusive as não detectadas, revisando o diff) segundo a taxonomia. Isso dá o ground truth para a taxa de detecção por categoria e, depois, para o E2.

O formato de saída do gate é o mesmo usado em `experiments/seeded/`, então o runner semeado pode ser reaproveitado para agregar os resultados.
