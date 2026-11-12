#!/usr/bin/env node
// E1 harness. One run:   npm run e1 -- --task T1 --arm A --rep 1
//            Pilot:      npm run e1 -- --pilot
//            Full plan:  npm run e1 -- --plan [--reps 3] [--arms A,B] [--concurrency 2]
//            Status:     npm run e1 -- --status [--pilot]
//            Summary:    npm run e1 -- --finish [--pilot]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AGENT_EFFORT,
  AGENT_MODEL,
  AGENT_TIMEOUT_MS,
  appendLog,
  cleanupClaudeProjectState,
  collectDiff,
  detectUsageLimit,
  evaluateCopy,
  isolationFlags,
  LEAK_PATTERN,
  MAX_TURNS,
  parseTranscript,
  prepareCopy,
  readJson,
  restoreArch,
  ROOT,
  RUNS_BASE,
  runAgent,
  sanitize,
  TASKS,
  taskPrompt,
  writeJsonAtomic,
} from './lib.mjs';

const PLAN_SEED = 20261112;
const MAX_ATTEMPTS = 2;

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback);

const planName = flag('pilot') ? 'pilot' : 'main';
const planDir = join(ROOT, 'experiments/e1', planName === 'pilot' ? 'pilot' : 'runs');
const stateFile = join(planDir, 'state.json');
const logFile = join(planDir, 'harness.log');
const concurrency = Number(opt('concurrency', 2));
mkdirSync(planDir, { recursive: true });

const log = (line) => {
  appendLog(logFile, line);
  console.log(line);
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rand) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Replication blocks: every task × arm cell once per block, randomized within the block,
// so an interrupted plan still covers every cell.
function buildPlan({ tasks, arms, reps, seed }) {
  const rand = mulberry32(seed);
  const runs = [];
  for (let rep = 1; rep <= reps; rep++) {
    const cells = tasks.flatMap((task) => arms.map((arm) => ({ task, arm })));
    for (const { task, arm } of shuffle(cells, rand)) runs.push({ runId: `${task}-${arm}-r${rep}`, task, arm, rep });
  }
  return runs;
}

function loadState() {
  return readJson(stateFile, null);
}

let state;
const save = () => state && writeJsonAtomic(stateFile, state);

function initState(spec) {
  state = loadState();
  const planned = buildPlan(spec);
  if (!state) {
    state = { plan: planName, seed: spec.seed, spec, createdAt: new Date().toISOString(), startedAt: null, finishedAt: null, pauses: [], runs: {} };
  }
  let order = Object.keys(state.runs).length;
  for (const r of planned) {
    if (!state.runs[r.runId]) state.runs[r.runId] = { ...r, order: order++, status: 'pending', attempts: 0, failures: 0, history: [] };
  }
  save();
}

const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

function acquireLock() {
  const lock = join(planDir, '.lock');
  const holder = Number(existsSync(lock) ? readFileSync(lock, 'utf8') : 0);
  if (holder && holder !== process.pid && isAlive(holder)) {
    console.error(`another harness (pid ${holder}) is running this plan`);
    process.exit(2);
  }
  writeFileSync(lock, String(process.pid));
  process.on('exit', () => {
    if (Number(readFileSync(lock, 'utf8')) === process.pid) rmSync(lock, { force: true });
  });
}

function killLeftoverAgent(pid) {
  if (!pid || !isAlive(pid)) return;
  const cmd = spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout;
  if (/claude/.test(cmd)) {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      /* not a group leader */
    }
    log(`killed leftover agent process group ${pid}`);
  }
}

function recoverInterrupted() {
  for (const run of Object.values(state.runs)) {
    if (run.status === 'running' || run.status === 'paused-limit') {
      killLeftoverAgent(run.agentPid);
      log(`run ${run.runId} was ${run.status} when the harness stopped; it will be redone from scratch`);
      if (run.status === 'running') run.history.push({ attempt: run.attempts, outcome: 'interrupted', at: new Date().toISOString() });
      run.status = 'pending';
      run.attempts = Math.max(0, run.attempts - 1);
      delete run.agentPid;
    }
  }
  if (existsSync(RUNS_BASE)) {
    for (const name of readdirSync(RUNS_BASE)) if (name.startsWith(`${planName}-`)) rmSync(join(RUNS_BASE, name), { recursive: true, force: true });
  }
  save();
}

const activeAgents = new Set();
function onSignal(signal) {
  log(`harness received ${signal}; stopping agents, runs in progress will be redone on restart`);
  for (const pid of activeAgents) {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }
  process.exit(130);
}

function analyse({ arm, parsed, transcriptText, diff }) {
  const gateRunsByAgent = parsed.bashCommands.filter((c) => /check:arch|check-arch/.test(c)).length;
  const leakHits = [];
  if (arm === 'A') {
    for (const line of transcriptText.split('\n')) {
      const m = LEAK_PATTERN.exec(line);
      if (m) leakHits.push(sanitize(line.slice(Math.max(0, m.index - 80), m.index + 80)));
    }
  }
  const outside = [];
  for (const { tool, input } of parsed.toolInputs) {
    const text = sanitize(JSON.stringify(input));
    if (/~\/(?!\.claude\/projects\/.*e1-runs)|ddd-boundary-policing|\/Users\//.test(text)) outside.push(`${tool}: ${text.slice(0, 200)}`);
  }
  const testsTouched = diff.files
    .filter((f) => f.status !== 'A' && /(\.spec\.ts|\.e2e-spec\.ts|jest.*config|global-setup)/.test(f.path))
    .map((f) => `${f.status} ${f.path}`);
  return { gateRunsByAgent, leakHits: leakHits.slice(0, 20), outsideAccess: outside.slice(0, 20), testsTouched };
}

async function doRun(run) {
  const runDir = join(planDir, run.runId);
  rmSync(runDir, { recursive: true, force: true });
  mkdirSync(runDir, { recursive: true });
  const copy = join(RUNS_BASE, `${planName}-${run.runId}-${Date.now().toString(36)}`);
  const startedAt = new Date();
  const rlog = (l) => log(`[${run.runId}] ${l}`);
  try {
    const { initialCommit, leaks } = prepareCopy(copy, run.arm);
    if (leaks.length) return { kind: 'failure', reason: `rule leak in the prepared copy: ${leaks.slice(0, 3).join(' | ')}` };
    rlog(`copy ready, agent starting (arm ${run.arm})`);

    const rawTranscript = join(runDir, 'transcript.raw.jsonl');
    const stderrFile = join(runDir, 'agent.stderr.txt');
    const agent = await runAgent({
      dir: copy,
      prompt: taskPrompt(run.task),
      transcriptFile: rawTranscript,
      stderrFile,
      log: rlog,
      onSpawn: (pid) => {
        run.agentPid = pid;
        activeAgents.add(pid);
        save();
      },
    });
    activeAgents.delete(run.agentPid);
    const transcriptText = sanitize(readFileSync(rawTranscript, 'utf8').split(copy).join('<copy>'));
    writeFileSync(join(runDir, 'transcript.jsonl'), transcriptText);
    rmSync(rawTranscript);
    const stderr = sanitize(readFileSync(stderrFile, 'utf8'));
    writeFileSync(stderrFile, stderr);
    const parsed = parseTranscript(join(runDir, 'transcript.jsonl'));

    const limit = detectUsageLimit(parsed.result, stderr);
    if (limit) return { kind: 'limit', limit };
    if (agent.timedOut) return { kind: 'failure', reason: `timeout after ${AGENT_TIMEOUT_MS / 60000} min` };
    if (!parsed.result) return { kind: 'failure', reason: `agent ended without a result event (exit ${agent.exitCode}, signal ${agent.signal}): ${stderr.slice(-300)}` };
    if (parsed.result.is_error && parsed.result.subtype !== 'error_max_turns') {
      return { kind: 'failure', reason: `agent error ${parsed.result.subtype}: ${sanitize(String(parsed.result.result ?? '')).slice(0, 300)}` };
    }

    rlog(`agent finished (${parsed.result.subtype}, ${parsed.result.num_turns} turns, $${parsed.result.total_cost_usd?.toFixed(2)}); evaluating`);
    const diff = collectDiff(copy, initialCommit);
    writeFileSync(join(runDir, 'diff.patch'), diff.patch);
    const restore = restoreArch(copy);
    const evaluation = evaluateCopy({ dir: copy, task: run.task, runDir });
    const analysis = analyse({ arm: run.arm, parsed, transcriptText, diff });
    const r = parsed.result;
    const u = r.usage ?? {};
    const meta = {
      runId: run.runId,
      plan: planName,
      task: run.task,
      arm: run.arm,
      rep: run.rep,
      attempt: run.attempts,
      modelRequested: AGENT_MODEL,
      modelsUsed: Object.keys(r.modelUsage ?? {}),
      modelUsage: r.modelUsage,
      effort: AGENT_EFFORT,
      maxTurns: MAX_TURNS,
      timeoutMs: AGENT_TIMEOUT_MS,
      claudeCodeVersion: parsed.init?.claude_code_version ?? null,
      isolation: {
        flags: isolationFlags(),
        skillsLoaded: parsed.init?.skills ?? null,
        mcpServers: parsed.init?.mcp_servers ?? null,
        slashCommands: parsed.init?.slash_commands ?? null,
        plugins: (parsed.init?.plugins ?? []).map((p) => p.name),
        permissionMode: parsed.init?.permissionMode ?? null,
        apiKeySource: parsed.init?.apiKeySource ?? null,
        instructionsFile: run.arm === 'A' ? null : 'CLAUDE.md',
      },
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      wallMs: agent.wallMs,
      durationMs: r.duration_ms,
      durationApiMs: r.duration_api_ms,
      numTurns: r.num_turns,
      tokens: {
        input: u.input_tokens ?? 0,
        output: u.output_tokens ?? 0,
        cacheRead: u.cache_read_input_tokens ?? 0,
        cacheCreation: u.cache_creation_input_tokens ?? 0,
      },
      costUsd: r.total_cost_usd,
      exitCode: agent.exitCode,
      stopReason: r.subtype,
      terminalReason: r.terminal_reason ?? null,
      resultText: sanitize(String(r.result ?? '')).slice(0, 4000),
      initialCommit,
      filesChanged: diff.files,
      lockfileChanged: diff.lockChanged,
      restoreNotes: restore.notes,
      contextMapAfterMerge: restore.mergedMap,
      evaluation,
      ...analysis,
    };
    writeJsonAtomic(join(runDir, 'meta.json'), meta);
    rlog(
      `done: acceptance ${evaluation.acceptance}, npm test ${evaluation.testsPassed ? 'pass' : 'FAIL'}, gate ${evaluation.gatePassed ? 'pass' : `${evaluation.gateViolations} violation(s) ${evaluation.rulesFired.join(',')}`}`,
    );
    return { kind: 'done', meta };
  } finally {
    rmSync(copy, { recursive: true, force: true });
    cleanupClaudeProjectState(copy);
  }
}

let pauseUntil = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let limitBackoffMin = 15;

async function worker(id) {
  for (;;) {
    while (Date.now() < pauseUntil) await sleep(Math.min(60_000, pauseUntil - Date.now()));
    const run = Object.values(state.runs)
      .filter((r) => r.status === 'pending')
      .sort((a, b) => a.order - b.order)[0];
    if (!run) return;
    run.status = 'running';
    run.attempts += 1;
    run.startedAt = new Date().toISOString();
    save();
    log(`[worker ${id}] starting ${run.runId} (attempt ${run.attempts})`);
    let outcome;
    try {
      outcome = await doRun(run);
    } catch (e) {
      outcome = { kind: 'failure', reason: `harness error: ${e.stack ?? e.message}` };
    }
    delete run.agentPid;
    const at = new Date().toISOString();
    if (outcome.kind === 'done') {
      run.status = 'done';
      run.finishedAt = at;
      run.costUsd = outcome.meta.costUsd;
      run.history.push({ attempt: run.attempts, outcome: 'done', at });
      limitBackoffMin = 15;
    } else if (outcome.kind === 'limit') {
      const wait = outcome.limit.resetAt ? Math.max(60_000, outcome.limit.resetAt.getTime() - Date.now() + 120_000) : limitBackoffMin * 60_000;
      if (!outcome.limit.resetAt) limitBackoffMin = Math.min(60, limitBackoffMin * 2);
      pauseUntil = Math.max(pauseUntil, Date.now() + wait);
      run.status = 'paused-limit';
      run.attempts -= 1;
      run.history.push({ attempt: run.attempts + 1, outcome: 'usage-limit', at, detail: outcome.limit.text });
      state.pauses.push({ at, until: new Date(pauseUntil).toISOString(), runId: run.runId, detail: outcome.limit.text });
      save();
      log(`ERROR usage limit hit in ${run.runId}; pausing until ${new Date(pauseUntil).toISOString()} (${outcome.limit.text})`);
      while (Date.now() < pauseUntil) await sleep(Math.min(60_000, pauseUntil - Date.now()));
      run.status = 'pending';
    } else {
      run.failures += 1;
      run.lastError = outcome.reason;
      run.history.push({ attempt: run.attempts, outcome: 'failure', at, reason: outcome.reason.slice(0, 500) });
      run.status = run.failures >= MAX_ATTEMPTS ? 'failed' : 'pending';
      log(`ERROR ${run.runId} attempt ${run.attempts} failed: ${outcome.reason.split('\n')[0].slice(0, 300)}${run.status === 'pending' ? ' (will retry)' : ' (giving up)'}`);
    }
    save();
  }
}

function fmtDuration(ms) {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

function status() {
  state = loadState();
  if (!state) {
    console.log(`no state for plan "${planName}" yet (${stateFile})`);
    return;
  }
  const runs = Object.values(state.runs);
  const by = (s) => runs.filter((r) => r.status === s);
  const done = by('done');
  const durations = done.map((r) => new Date(r.finishedAt) - new Date(r.startedAt)).filter((d) => d > 0);
  const mean = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const remaining = by('pending').length + by('running').length + by('paused-limit').length;
  const started = state.startedAt ? new Date(state.startedAt) : null;
  const end = state.finishedAt ? new Date(state.finishedAt) : new Date();
  const cost = done.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  const lockPid = Number(existsSync(join(planDir, '.lock')) ? readFileSync(join(planDir, '.lock'), 'utf8') : 0);
  const lastError = existsSync(logFile)
    ? readFileSync(logFile, 'utf8').split('\n').filter((l) => l.includes('ERROR')).pop() ?? '—'
    : '—';
  console.log(`E1 plan "${planName}" (${runs.length} runs, seed ${state.seed})`);
  console.log(`  harness process: ${lockPid && isAlive(lockPid) ? `alive (pid ${lockPid})` : 'not running'}`);
  console.log(`  done ${done.length} · failed ${by('failed').length} · running ${by('running').length} · paused ${by('paused-limit').length} · pending ${by('pending').length}`);
  console.log(`  running now: ${by('running').map((r) => r.runId).join(', ') || '—'}`);
  console.log(`  elapsed: ${started ? fmtDuration(end - started) : 'not started'} · mean per run: ${mean ? fmtDuration(mean) : '—'}`);
  console.log(`  estimated finish: ${mean && remaining ? new Date(Date.now() + (remaining * mean) / concurrency).toLocaleString() : state.finishedAt ? `finished ${new Date(state.finishedAt).toLocaleString()}` : '—'}`);
  console.log(`  equivalent API cost so far: $${cost.toFixed(2)} · usage-limit pauses: ${state.pauses.length}`);
  console.log(`  last error: ${lastError}`);
}

function finish() {
  state = loadState();
  const runs = Object.values(state.runs).sort((a, b) => a.order - b.order);
  const done = runs.filter((r) => r.status === 'done');
  const verdict =
    done.length === runs.length
      ? `COMPLETO: ${done.length} de ${runs.length} execuções concluídas.`
      : done.length === 0
        ? `NÃO EXECUTADO: nenhuma execução concluída (${runs.filter((r) => r.status === 'failed').length} falharam).`
        : `PARCIAL (${done.length} de ${runs.length}): ${runs.filter((r) => r.status === 'failed').length} falharam, ${runs.filter((r) => !['done', 'failed'].includes(r.status)).length} não executadas.`;

  const points = [];
  const notesFile = join(ROOT, 'experiments/e1/attention-notes.md');
  if (existsSync(notesFile)) points.push(...readFileSync(notesFile, 'utf8').split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2)));
  const metas = done.map((r) => ({ run: r, meta: readJson(join(planDir, r.runId, 'meta.json'), {}) }));
  const versions = [...new Set(metas.map((m) => m.meta.claudeCodeVersion))];
  if (versions.length > 1) points.push(`Versão do Claude Code mudou durante o plano: ${versions.join(', ')}.`);
  for (const { run, meta } of metas) {
    const extraModels = (meta.modelsUsed ?? []).filter((m) => m !== AGENT_MODEL);
    if (extraModels.length) points.push(`${run.runId}: além de \`${AGENT_MODEL}\`, a execução registrou uso de ${extraModels.join(', ')} (provável uso interno do Claude Code ou subagente; ver \`meta.json\` → \`modelUsage\`).`);
    if (meta.leakHits?.length) points.push(`${run.runId}: possível menção às regras na transcrição do braço A: \`${meta.leakHits[0]}\` (${meta.leakHits.length} ocorrência(s)).`);
    if (meta.outsideAccess?.length) points.push(`${run.runId}: o agente usou caminhos fora da cópia: \`${meta.outsideAccess[0]}\` (${meta.outsideAccess.length} ocorrência(s)).`);
    if (meta.testsTouched?.length) points.push(`${run.runId}: o agente alterou testes ou configuração de teste existentes: ${meta.testsTouched.join(', ')}.`);
    if (meta.stopReason === 'error_max_turns') points.push(`${run.runId}: o agente atingiu o limite de ${MAX_TURNS} turnos sem terminar.`);
    if ((meta.isolation?.skillsLoaded?.length ?? 0) > 0 || (meta.isolation?.mcpServers?.length ?? 0) > 0) points.push(`${run.runId}: skills ou MCP carregados apesar do isolamento.`);
    if (meta.restoreNotes?.length) points.push(`${run.runId}: ${meta.restoreNotes.join('; ')}.`);
  }
  for (const r of runs.filter((x) => x.status === 'failed')) points.push(`${r.runId} falhou após ${r.failures} tentativas: ${r.lastError?.split('\n')[0].slice(0, 200)}`);
  const retried = runs.filter((r) => r.history.some((h) => h.outcome === 'failure' || h.outcome === 'interrupted') && r.status === 'done');
  if (retried.length) points.push(`Execuções refeitas antes de concluir: ${retried.map((r) => r.runId).join(', ')}.`);
  if (state.pauses.length) points.push(`${state.pauses.length} pausa(s) por limite de uso; a ordem real de execução pode ter se afastado da planejada (ver \`state.json\` → \`pauses\`).`);
  const failuresByTask = {};
  for (const r of runs.filter((x) => x.failures > 0)) failuresByTask[r.task] = (failuresByTask[r.task] ?? 0) + r.failures;
  for (const [task, n] of Object.entries(failuresByTask)) if (n >= 3) points.push(`Muitas falhas na tarefa ${task}: ${n}.`);

  const rows = runs.map((r) => {
    const m = readJson(join(planDir, r.runId, 'meta.json'), null);
    const e = m?.evaluation;
    return `| ${r.runId} | ${r.status} | ${e ? e.acceptance : '—'} | ${e ? (e.testsPassed ? 'sim' : 'não') : '—'} | ${e ? (e.gatePassed ? '0' : `${e.gateViolations} (${e.rulesFired.join(', ')})`) : '—'} | ${m ? m.numTurns : '—'} | ${m ? `$${m.costUsd?.toFixed(2)}` : '—'} | ${m ? fmtDuration(m.wallMs) : '—'} |`;
  });
  const md = [
    verdict,
    '',
    '## ⚠️ Pontos de atenção para o aluno',
    '',
    ...(points.length ? points.map((p) => `- ${p}`) : ['nenhum']),
    '',
    `## Status (plano "${planName}", semente ${state.seed})`,
    '',
    `- Início: ${state.startedAt ?? '—'} · fim: ${state.finishedAt ?? '—'}`,
    `- Custo equivalente estimado (preço de API; a execução usou assinatura): $${done.reduce((s, r) => s + (r.costUsd ?? 0), 0).toFixed(2)}`,
    `- Pausas por limite de uso: ${state.pauses.length}`,
    '',
    '| Execução | Status | Aceite | `npm test` | Gate (violações) | Turnos | Custo eq. | Duração |',
    '|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
    'Gerado por `npm run e1 -- --finish`. Resultados agregados em `experiments/e1/results/`.',
    '',
  ].join('\n');
  writeFileSync(join(planDir, 'FINISHED.md'), md);
  console.log(md);
}

async function runPlan(spec) {
  acquireLock();
  initState(spec);
  recoverInterrupted();
  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGHUP', () => log('harness received SIGHUP; ignoring and continuing'));
  if (!state.startedAt) state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  save();
  const pending = Object.values(state.runs).filter((r) => r.status === 'pending').length;
  log(`plan "${planName}": ${Object.keys(state.runs).length} runs, ${pending} to go, concurrency ${concurrency}`);
  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i + 1)));
  state.finishedAt = new Date().toISOString();
  save();
  log(`plan "${planName}" finished`);
  finish();
  if (planName === 'main') spawnSync('node', [join(ROOT, 'scripts/e1/aggregate.mjs')], { stdio: 'inherit', cwd: ROOT });
}

if (flag('status')) {
  status();
} else if (flag('finish')) {
  finish();
} else if (flag('pilot')) {
  await runPlan({ tasks: ['T1', 'T4'], arms: ['A', 'B'], reps: 1, seed: PLAN_SEED });
} else if (flag('plan')) {
  const arms = opt('arms', 'A,B').split(',');
  await runPlan({ tasks: TASKS, arms, reps: Number(opt('reps', 3)), seed: PLAN_SEED });
} else if (opt('task')) {
  const run = { runId: `${opt('task')}-${opt('arm', 'A')}-r${opt('rep', '1')}`, task: opt('task'), arm: opt('arm', 'A'), rep: Number(opt('rep', '1')), attempts: 1 };
  const outcome = await doRun(run);
  console.log(JSON.stringify({ kind: outcome.kind, reason: outcome.reason, evaluation: outcome.meta?.evaluation }, null, 2));
} else {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 7).join('\n'));
}
