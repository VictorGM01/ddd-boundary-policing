# E1: checagem do ambiente (preflight)

Gerado por `node scripts/e1/preflight.mjs` em 2026-11-12T22:34:52.223Z. Itens marcados com ⚠️ entram nos pontos de atenção do `FINISHED.md`.

| Item | Resultado | |
|---|---|---|
| Instrução global (`~/.claude/CLAUDE.md` e similares) | nenhuma | ✔ |
| Skills do usuário (`~/.claude/skills`) | ddd, prisma-migrations, sprint-summary, synced, tdd-bugfix, testing-philosophy (neutralizadas com `--disable-slash-commands`; conferido no evento init do piloto) | ✔ |
| Configuração do usuário (`~/.claude/settings.json`) | plugins habilitados: frontend-design@claude-plugins-official, swift-lsp@claude-plugins-official, vercel@claude-plugins-official; hooks: não (ignorados com `--setting-sources project`) | ✔ |
| MCP servers configurados para o usuário | claude.ai Claude Docs, claude.ai Booking.com, claude.ai Google Docs, plugin:vercel:vercel, plugin:engineering:slack, plugin:engineering:linear, plugin:engineering:atlassian, plugin:engineering:notion, plugin:engineering:datadog, plugin:engineering:google calendar, plugin:engineering:gmail, plugin:design:figma, plugin:design:intercom, plugin:design:google calendar, plugin:design:gmail (bloqueados com `--strict-mcp-config` + config vazia) | ✔ |
| Versão do Claude Code | 2.1.285 (Claude Code) | ✔ |
| `ANTHROPIC_API_KEY` no ambiente | não definida (usa o login da assinatura) | ✔ |
| Autenticação (ambiente limpo) | logado: true; método: claude.ai; assinatura: max | ✔ |
| Modelo `claude-sonnet-5-5` disponível (chamada de teste) | sim; skills carregadas: 0; MCP: 0; slash commands: 0; plugins: cc-plugin-agents-md, cc-plugin-telemetry | ✔ |
| Docker | disponível (servidor 29.4.0); não usado, ver ADR-018 | ✔ |
| `npm test` no baseline | verde | ✔ |
| `npm run check:arch` no baseline | verde | ✔ |
| Tag `e1-baseline` | 78875ea | ✔ |
| Espaço livre em disco (volume do `$TMPDIR`) | 4 GiB (98% usado) | ⚠️ |
| Mac na tomada (`pmset -g batt`) | NÃO, na bateria (44%) | ⚠️ |
| Máquina | Mac16,12, Apple M4, 16 GB RAM, macOS 26.6.2, Node v22.18.0 | ✔ |
