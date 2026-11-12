# Pontos de atenção registrados pela sessão orquestradora

Lido por `npm run e1 -- --finish`: cada linha que começa com "- " entra na seção "Pontos de atenção" do `FINISHED.md`.

- Preflight (experiments/e1/preflight.md): o Mac estava **na bateria** (cerca de 45%) quando o experimento foi montado. O `caffeinate -s` não impede o repouso na bateria; se a bateria acabar, o plano para no meio e retoma do ponto em que parou quando for executado de novo (`npm run e1 -- --plan`). A ordem em blocos de replicação (ADR-021) garante repetições completas de todas as células mesmo assim.
- Preflight: disco com cerca de **4 GiB livres (98% usado)**. As cópias usam clone APFS e são apagadas a cada execução, mas um disco cheio derrubaria execuções (aparecem como `failed`).
- Sem container: o agente rodou com as permissões do usuário no Mac (ADR-018). O harness procura caminhos fora da cópia nas chamadas de ferramenta; ocorrências aparecem nesta lista, por execução.
- Testes de aceite parciais em T2 (preço de prescrição não verificável) e T4 (fatura paga não verificável); T3 e T6 aceitam formatos variados (ADR-020).
- Decisões tomadas sem o aluno: estão nos ADR-016 a ADR-022 (e seguintes) de docs/decisoes.md.
