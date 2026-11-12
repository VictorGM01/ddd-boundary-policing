#!/usr/bin/env node
// E1 preflight: checks the environment before the pilot and writes experiments/e1/preflight.md.
// Usage: node scripts/e1/preflight.mjs [--no-smoke]
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { AGENT_MODEL, cleanEnv, isolationFlags, sanitize } from './lib.mjs';

const root = resolve(import.meta.dirname, '../..');
const home = homedir();
const smoke = !process.argv.includes('--no-smoke');
const items = [];
const warn = (label, value, problem) => items.push({ label, value, problem });

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env: cleanEnv(), ...opts });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}

// Global instructions that Claude Code could load regardless of the project.
const globalCandidates = [
  join(home, '.claude/CLAUDE.md'),
  join(home, '.claude/CLAUDE.local.md'),
  join(home, 'CLAUDE.md'),
  join(home, 'AGENTS.md'),
];
const found = globalCandidates.filter((p) => existsSync(p));
warn('Instrução global (`~/.claude/CLAUDE.md` e similares)', found.length ? found.map(sanitize).join(', ') : 'nenhuma', found.length > 0);

const skillsDir = join(home, '.claude/skills');
const skills = existsSync(skillsDir) ? readdirSync(skillsDir).filter((n) => !n.startsWith('.')) : [];
warn(
  'Skills do usuário (`~/.claude/skills`)',
  skills.length ? `${skills.join(', ')} (neutralizadas com \`--disable-slash-commands\`; conferido no evento init do piloto)` : 'nenhuma',
  false,
);

let settings = {};
try {
  settings = JSON.parse(readFileSync(join(home, '.claude/settings.json'), 'utf8'));
} catch {
  /* no user settings */
}
const plugins = Object.entries(settings.enabledPlugins ?? {}).filter(([, on]) => on).map(([name]) => name);
warn(
  'Configuração do usuário (`~/.claude/settings.json`)',
  `plugins habilitados: ${plugins.join(', ') || 'nenhum'}; hooks: ${settings.hooks ? 'sim' : 'não'} (ignorados com \`--setting-sources project\`)`,
  false,
);

const mcp = sh('claude', ['mcp', 'list'], { cwd: tmpdir() });
const mcpNames = mcp.out
  .split('\n')
  .filter((l) => /:\s/.test(l) && !l.startsWith('Checking'))
  .map((l) => /^(.*?):\s/.exec(l)[1].trim());
warn('MCP servers configurados para o usuário', `${mcpNames.join(', ') || 'nenhum'} (bloqueados com \`--strict-mcp-config\` + config vazia)`, false);

const version = sh('claude', ['--version']).out;
warn('Versão do Claude Code', version, false);

const apiKey = Boolean(process.env.ANTHROPIC_API_KEY);
warn('`ANTHROPIC_API_KEY` no ambiente', apiKey ? 'definida' : 'não definida (usa o login da assinatura)', apiKey);

const auth = sh('claude', ['auth', 'status'], { cwd: tmpdir() });
let authSummary;
try {
  const a = JSON.parse(auth.out);
  authSummary = `logado: ${a.loggedIn}; método: ${a.authMethod}; assinatura: ${a.subscriptionType}`;
} catch {
  authSummary = auth.out.split('\n')[0];
}
warn('Autenticação (ambiente limpo)', authSummary, !/logado: true/.test(authSummary));

if (smoke) {
  const dir = mkdtempSync(join(tmpdir(), 'e1-preflight-'));
  const r = spawnSync(
    'claude',
    ['-p', 'Reply with just OK.', '--model', AGENT_MODEL, '--output-format', 'stream-json', '--verbose', '--max-turns', '2', ...isolationFlags()],
    { cwd: dir, env: cleanEnv(), encoding: 'utf8', input: '', timeout: 120_000 },
  );
  rmSync(dir, { recursive: true, force: true });
  const events = (r.stdout ?? '').split('\n').filter(Boolean).map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return {};
    }
  });
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init') ?? {};
  const result = events.find((e) => e.type === 'result') ?? {};
  const ok = init.model === AGENT_MODEL && result.subtype === 'success';
  warn(
    `Modelo \`${AGENT_MODEL}\` disponível (chamada de teste)`,
    ok
      ? `sim; skills carregadas: ${init.skills?.length ?? '?'}; MCP: ${init.mcp_servers?.length ?? '?'}; slash commands: ${init.slash_commands?.length ?? '?'}; plugins: ${(init.plugins ?? []).map((p) => p.name).join(', ')}`
      : `falhou: ${sanitize((r.stderr ?? '').slice(0, 300))}`,
    !ok || (init.skills?.length ?? 0) > 0 || (init.mcp_servers?.length ?? 0) > 0,
  );
}

const docker = sh('docker', ['info', '--format', '{{.ServerVersion}}']);
warn('Docker', docker.code === 0 ? `disponível (servidor ${docker.out}); não usado, ver ADR-018` : 'indisponível', false);

const test = sh('npm', ['test'], { cwd: root });
warn('`npm test` no baseline', test.code === 0 ? 'verde' : 'FALHOU', test.code !== 0);
const gate = sh('npm', ['run', 'check:arch'], { cwd: root });
warn('`npm run check:arch` no baseline', gate.code === 0 ? 'verde' : 'FALHOU', gate.code !== 0);
const tag = sh('git', ['rev-parse', '--short', 'e1-baseline^{commit}'], { cwd: root });
warn('Tag `e1-baseline`', tag.code === 0 ? tag.out : 'ausente', tag.code !== 0);

const df = execFileSync('df', ['-g', tmpdir()], { encoding: 'utf8' }).trim().split('\n').pop().split(/\s+/);
const freeGb = Number(df[3]);
warn('Espaço livre em disco (volume do `$TMPDIR`)', `${freeGb} GiB (${df[4]} usado)`, freeGb < 10);

const batt = sh('pmset', ['-g', 'batt']).out;
const onAc = /AC Power/.test(batt);
const pct = /(\d+)%/.exec(batt)?.[1];
warn('Mac na tomada (`pmset -g batt`)', `${onAc ? 'sim' : 'NÃO, na bateria'}${pct ? ` (${pct}%)` : ''}`, !onAc);

const node = process.version;
const hw = sh('sysctl', ['-n', 'hw.model']).out;
const chip = sh('sysctl', ['-n', 'machdep.cpu.brand_string']).out;
const ram = Math.round(Number(sh('sysctl', ['-n', 'hw.memsize']).out) / 1024 ** 3);
const os = sh('sw_vers', ['-productVersion']).out;
warn('Máquina', `${hw}, ${chip}, ${ram} GB RAM, macOS ${os}, Node ${node}`, false);

const now = new Date().toISOString();
const lines = [
  '# E1: checagem do ambiente (preflight)',
  '',
  `Gerado por \`node scripts/e1/preflight.mjs\` em ${now}. Itens marcados com ⚠️ entram nos pontos de atenção do \`FINISHED.md\`.`,
  '',
  '| Item | Resultado | |',
  '|---|---|---|',
  ...items.map((i) => `| ${i.label} | ${i.value.replace(/\|/g, '\\|')} | ${i.problem ? '⚠️' : '✔'} |`),
  '',
];
writeFileSync(join(root, 'experiments/e1/preflight.md'), lines.join('\n'));
console.log(lines.join('\n'));
