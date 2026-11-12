// Shared pieces of the E1 harness: isolated copy, arm variants, agent call, restore and evaluation.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir, userInfo } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '../..');
export const BASELINE_REF = 'e1-baseline';
export const AGENT_MODEL = 'claude-sonnet-5-5';
export const AGENT_EFFORT = 'high';
export const MAX_TURNS = 40;
export const AGENT_TIMEOUT_MS = 20 * 60_000;
export const TASKS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
export const RUNS_BASE = join(realpathSync(tmpdir()), 'e1-runs');

// Tools that are irrelevant to the task or would add noise; denied identically in every arm.
const DENIED_TOOLS = ['WebFetch', 'WebSearch', 'RemoteTrigger', 'PushNotification', 'CronCreate', 'ScheduleWakeup', 'Workflow', 'DesignSync'];

// Removed from every copy: documentation, experiments and helpers that only serve the research.
const REMOVED_ALWAYS = ['docs', 'experiments', 'README.md', '.github', 'scripts/eval-seeded.mjs', 'scripts/wrap-mermaid.mjs'];
// Removed in arms A and B only: the gate and every artifact that spells out the rules.
const ARCH_FILES = ['context-map.json', '.dependency-cruiser.cjs', 'scripts/check-arch.mjs'];
const RESEARCH_SCRIPTS = ['eval:seeded', 'arch:graph', 'arch:graph:contexts'];
const GATE_PACKAGES = ['dependency-cruiser', 'eslint-plugin-boundaries', 'eslint-import-resolver-typescript'];

// Strings that would reveal the rules or the research to an arm A/B agent.
export const LEAK_PATTERN = /check:arch|check-arch|context-map|\.dependency-cruiser|\[R\d{1,2}\]|taxonom|agent-rules|seeded|eval-seeded/i;

const CHECK_ARCH_SENTENCE = ' `npm run check:arch` must pass before you finish.';
const MAP_SENTENCE = 'If a feature needs one, add it to `context-map.json` and say so explicitly in your summary.';
const MAP_SENTENCE_B =
  'If a feature needs one, declare it in `context-map.json` at the repository root (create the file if it does not exist, with the shape `{ "contexts": { "<context>": { "publishes": "<file>.events.ts", "upstream": ["<context>"] } } }`) and say so explicitly in your summary.';

export function cleanEnv() {
  const nodeDir = dirname(process.execPath);
  return {
    HOME: homedir(),
    USER: userInfo().username,
    LOGNAME: userInfo().username,
    SHELL: '/bin/zsh',
    LANG: 'en_US.UTF-8',
    TERM: 'dumb',
    TMPDIR: tmpdir(),
    PATH: [nodeDir, '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(':'),
  };
}

export function isolationFlags() {
  return [
    '--setting-sources',
    'project',
    '--disable-slash-commands',
    '--strict-mcp-config',
    '--mcp-config',
    '{"mcpServers":{}}',
    '--no-session-persistence',
    '--permission-mode',
    'bypassPermissions',
    '--disallowedTools',
    DENIED_TOOLS.join(','),
  ];
}

const HOME_RE = new RegExp(homedir().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
const USER_RE = new RegExp(`\\b${userInfo().username}\\b`, 'g');
export function sanitize(text) {
  return String(text).replace(HOME_RE, '~').replace(USER_RE, '<user>');
}

export function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, file);
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function baselineFile(path) {
  return execFileSync('git', ['show', `${BASELINE_REF}:${path}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

export function claudeVersion() {
  return spawnSync('claude', ['--version'], { encoding: 'utf8', env: cleanEnv() }).stdout.trim();
}

// Task statements come verbatim from the blockquotes of experiments/e1/backlog.md.
export function loadTasks() {
  const md = readFileSync(join(ROOT, 'experiments/e1/backlog.md'), 'utf8');
  const tasks = {};
  for (const section of md.split(/^## /m).slice(1)) {
    const id = /^(T\d)\b/.exec(section)?.[1];
    if (!id) continue;
    const quote = section
      .split('\n')
      .filter((l) => l.startsWith('> '))
      .map((l) => l.slice(2))
      .join(' ')
      .trim();
    tasks[id] = quote;
  }
  return tasks;
}

export function taskPrompt(taskId) {
  const statement = loadTasks()[taskId];
  if (!statement) throw new Error(`No statement for ${taskId} in backlog.md`);
  return `${statement}\n\nImplement this feature in this repository, including tests. Finish with \`npm test\` passing.\n`;
}

export function rulesFor(arm) {
  const rules = readFileSync(join(ROOT, 'experiments/e1/agent-rules.md'), 'utf8');
  if (arm === 'A') return null;
  if (!rules.includes(CHECK_ARCH_SENTENCE) || !rules.includes(MAP_SENTENCE)) {
    throw new Error('agent-rules.md changed: update the variant generation in scripts/e1/lib.mjs');
  }
  if (arm === 'C') return rules;
  return rules.replace(CHECK_ARCH_SENTENCE, '').replace(MAP_SENTENCE, MAP_SENTENCE_B);
}

export function styleOnlyEslintConfig() {
  return readFileSync(join(ROOT, 'scripts/e1/templates/eslint.config.style.mjs'), 'utf8');
}

function git(dir, args, opts = {}) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
}

export function scanForLeaks(dir) {
  const hits = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name !== 'package-lock.json' && statSync(p).size < 2_000_000) {
        const text = readFileSync(p, 'utf8');
        const lines = text.split('\n');
        lines.forEach((line, i) => {
          if (LEAK_PATTERN.test(line) || LEAK_PATTERN.test(entry.name)) hits.push(`${relative(dir, p)}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
      }
    }
  };
  walk(dir);
  return hits;
}

// Builds the throwaway copy for one run and returns its initial commit.
export function prepareCopy(dir, arm) {
  mkdirSync(dir, { recursive: true });
  execFileSync('/bin/sh', ['-c', `git -C "${ROOT}" archive ${BASELINE_REF} | tar -x -C "${dir}"`]);
  execFileSync('cp', ['-c', '-R', join(ROOT, 'node_modules'), join(dir, 'node_modules')]);

  for (const p of REMOVED_ALWAYS) rmSync(join(dir, p), { recursive: true, force: true });
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  for (const s of RESEARCH_SCRIPTS) delete pkg.scripts[s];
  if (arm !== 'C') {
    for (const p of ARCH_FILES) rmSync(join(dir, p), { force: true });
    delete pkg.scripts['check:arch'];
    writeFileSync(join(dir, 'eslint.config.mjs'), styleOnlyEslintConfig());
  }
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  if (existsSync(join(dir, 'scripts')) && readdirSync(join(dir, 'scripts')).length === 0) rmSync(join(dir, 'scripts'), { recursive: true });

  const leaks = arm === 'C' ? [] : scanForLeaks(dir);
  const rules = rulesFor(arm);
  if (rules) writeFileSync(join(dir, 'CLAUDE.md'), rules);

  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['add', '-A']);
  git(dir, ['-c', 'user.name=e1-harness', '-c', 'user.email=e1@harness.invalid', 'commit', '-q', '-m', 'initial state', '--no-verify']);
  return { initialCommit: git(dir, ['rev-parse', 'HEAD']).trim(), leaks };
}

// Runs the headless agent in the copy. Resolves with what the stream-json transcript says.
export function runAgent({ dir, prompt, transcriptFile, stderrFile, timeoutMs = AGENT_TIMEOUT_MS, log = () => {}, onSpawn = () => {} }) {
  return new Promise((resolvePromise) => {
    const out = openSync(transcriptFile, 'w');
    const err = openSync(stderrFile, 'w');
    const args = ['-p', '--model', AGENT_MODEL, '--effort', AGENT_EFFORT, '--max-turns', String(MAX_TURNS), '--output-format', 'stream-json', '--verbose', ...isolationFlags()];
    const started = Date.now();
    const child = spawn('claude', args, { cwd: dir, env: cleanEnv(), detached: true, stdio: ['pipe', out, err] });
    onSpawn(child.pid);
    let timedOut = false;
    const killGroup = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {
        /* group already gone */
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      log(`timeout after ${Math.round(timeoutMs / 60000)} min, killing agent`);
      killGroup('SIGTERM');
      setTimeout(() => killGroup('SIGKILL'), 10_000);
    }, timeoutMs);
    child.stdin.end(prompt);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      killGroup('SIGKILL');
      closeSync(out);
      closeSync(err);
      resolvePromise({ exitCode: code, signal, timedOut, wallMs: Date.now() - started });
    });
    child.on('error', (e) => log(`spawn error: ${e.message}`));
  });
}

export function parseTranscript(file) {
  const events = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      /* partial line from a killed process */
    }
  }
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init') ?? null;
  const result = [...events].reverse().find((e) => e.type === 'result') ?? null;
  const bashCommands = [];
  const toolInputs = [];
  for (const e of events) {
    if (e.type !== 'assistant') continue;
    for (const block of e.message?.content ?? []) {
      if (block.type !== 'tool_use') continue;
      toolInputs.push({ tool: block.name, input: block.input });
      if (block.name === 'Bash' && block.input?.command) bashCommands.push(block.input.command);
    }
  }
  return { events, init, result, bashCommands, toolInputs };
}

const LIMIT_RE = /usage limit|limit reached|rate.?limit|out of (extra )?usage|too many requests|\b429\b|overloaded/i;
export function detectUsageLimit(result, stderr) {
  const text = `${result?.result ?? ''} ${result?.api_error_status ?? ''} ${stderr ?? ''}`;
  const isLimit = (result?.is_error && LIMIT_RE.test(text)) || result?.api_error_status === 429 || (!result && LIMIT_RE.test(stderr ?? ''));
  if (!isLimit) return null;
  const epoch = /\|(\d{10})\b/.exec(text)?.[1];
  if (epoch) return { resetAt: new Date(Number(epoch) * 1000), text: text.trim().slice(0, 300) };
  const clock = /resets?\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(text);
  if (clock) {
    let h = Number(clock[1]) % 12;
    if (clock[3].toLowerCase() === 'pm') h += 12;
    const d = new Date();
    d.setHours(h, Number(clock[2] ?? 0), 0, 0);
    if (d <= new Date()) d.setDate(d.getDate() + 1);
    return { resetAt: d, text: text.trim().slice(0, 300) };
  }
  return { resetAt: null, text: text.trim().slice(0, 300) };
}

// Diff of everything the agent changed, against the initial commit (agent commits included).
export function collectDiff(dir, initialCommit) {
  git(dir, ['add', '-A']);
  const patch = git(dir, ['diff', '--cached', '--binary', initialCommit, '--', '.', ':(exclude)package-lock.json']);
  const files = git(dir, ['diff', '--cached', '--name-status', initialCommit, '--', '.', ':(exclude)package-lock.json'])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [status, ...paths] = l.split('\t');
      return { status, path: paths.at(-1) };
    });
  const lockChanged = git(dir, ['diff', '--cached', '--name-only', initialCommit, '--', 'package-lock.json']).trim() !== '';
  return { patch, files, lockChanged };
}

// Puts the gate back with the baseline rules. A context map the agent declared is merged, not discarded.
export function restoreArch(dir) {
  const notes = [];
  for (const f of ['.dependency-cruiser.cjs', 'eslint.config.mjs', 'scripts/check-arch.mjs']) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), baselineFile(f));
  }
  const base = JSON.parse(baselineFile('context-map.json'));
  const agentMapPath = join(dir, 'context-map.json');
  if (existsSync(agentMapPath)) {
    const agentMap = readJson(agentMapPath, null);
    if (agentMap?.contexts) {
      for (const [name, ctx] of Object.entries(agentMap.contexts)) {
        const target = base.contexts[name];
        if (!target) {
          notes.push(`agent map declares unknown context "${name}" (ignored)`);
          continue;
        }
        for (const up of ctx.upstream ?? []) {
          if (base.contexts[up] && !target.upstream.includes(up)) {
            target.upstream.push(up);
            notes.push(`relation declared by agent: ${up} → ${name}`);
          }
        }
        if (ctx.publishes && ctx.publishes !== target.publishes) {
          notes.push(`published contract declared by agent: ${name} publishes ${ctx.publishes}`);
          target.publishes = ctx.publishes;
        }
      }
    } else {
      notes.push('agent context-map.json unreadable (baseline map used)');
    }
  }
  writeFileSync(agentMapPath, `${JSON.stringify(base, null, 2)}\n`);
  for (const p of GATE_PACKAGES) {
    if (!existsSync(join(dir, 'node_modules', p))) {
      execFileSync('cp', ['-c', '-R', join(ROOT, 'node_modules', p), join(dir, 'node_modules', p)]);
      notes.push(`gate package ${p} was missing after the run and was restored`);
    }
  }
  return { mergedMap: base, notes };
}

function runCmd(cmd, args, dir, timeoutMs, extraEnv = {}) {
  const started = Date.now();
  const r = spawnSync(cmd, args, {
    cwd: dir,
    env: { ...cleanEnv(), CI: '1', ...extraEnv },
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  return { exitCode: r.status, timedOut: r.error?.code === 'ETIMEDOUT', ms: Date.now() - started, output };
}

const tail = (s, n = 4000) => sanitize(s.length > n ? s.slice(-n) : s);

export function evaluateCopy({ dir, task, runDir }) {
  const generate = runCmd('npx', ['prisma', 'generate'], dir, 120_000);

  const gateFile = join(runDir, 'gate.json');
  const gate = runCmd('node', ['scripts/check-arch.mjs', '--json', gateFile, '--quiet'], dir, 180_000);
  const gateJson = readJson(gateFile, null);
  if (!gateJson) writeJsonAtomic(gateFile, { error: 'gate did not produce a report', exitCode: gate.exitCode, output: tail(gate.output) });

  const typecheck = runCmd('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], dir, 180_000);
  const npmTest = runCmd('npm', ['test'], dir, 600_000);
  const counts = [...npmTest.output.matchAll(/Tests:\s+(?:(\d+) failed, )?(?:(\d+) skipped, )?(?:(\d+) passed, )?(\d+) total/g)].map((m) => ({
    failed: Number(m[1] ?? 0),
    passed: Number(m[3] ?? 0),
    total: Number(m[4]),
  }));
  writeJsonAtomic(join(runDir, 'tests.json'), {
    passed: npmTest.exitCode === 0,
    exitCode: npmTest.exitCode,
    timedOut: npmTest.timedOut,
    ms: npmTest.ms,
    suites: counts,
    typecheckPassed: typecheck.exitCode === 0,
    typecheckTail: typecheck.exitCode === 0 ? '' : tail(typecheck.output, 2000),
    prismaGenerateExit: generate.exitCode,
    outputTail: tail(npmTest.output),
  });

  const accDir = join(dir, 'e1-acceptance');
  cpSync(join(ROOT, 'experiments/e1/acceptance'), accDir, { recursive: true });
  const accOut = join(accDir, 'result.json');
  const acc = runCmd(
    'node_modules/.bin/jest',
    ['--config', 'e1-acceptance/jest.config.ts', '--runInBand', '--json', `--outputFile=${accOut}`, `e1-acceptance/${task}.e2e-spec.ts`],
    dir,
    300_000,
  );
  const accJson = readJson(accOut, null);
  const tests = (accJson?.testResults ?? []).flatMap((s) =>
    (s.assertionResults ?? []).map((a) => ({ title: a.title, status: a.status, failure: tail((a.failureMessages ?? []).join('\n'), 1500) })),
  );
  const suiteError = (accJson?.testResults ?? []).map((s) => s.message).filter(Boolean).join('\n');
  writeJsonAtomic(join(runDir, 'acceptance.json'), {
    task,
    passed: acc.exitCode === 0 && tests.length > 0 && tests.every((t) => t.status === 'passed'),
    numPassed: tests.filter((t) => t.status === 'passed').length,
    numTotal: tests.length,
    exitCode: acc.exitCode,
    timedOut: acc.timedOut,
    tests,
    suiteError: suiteError ? tail(suiteError, 3000) : undefined,
    outputTail: accJson ? undefined : tail(acc.output),
  });

  return {
    gatePassed: gateJson?.passed ?? null,
    gateViolations: gateJson?.violations?.length ?? null,
    rulesFired: gateJson?.rulesFired ?? [],
    testsPassed: npmTest.exitCode === 0,
    typecheckPassed: typecheck.exitCode === 0,
    acceptancePassed: acc.exitCode === 0 && tests.length > 0 && tests.every((t) => t.status === 'passed'),
    acceptance: `${tests.filter((t) => t.status === 'passed').length}/${tests.length}`,
  };
}

// Claude Code keeps per-directory state under ~/.claude/projects; remove only what our copies created.
export function cleanupClaudeProjectState(dir) {
  const runSlug = dir.split('/').pop().replace(/[^A-Za-z0-9]/g, '-');
  const projects = join(homedir(), '.claude/projects');
  if (!existsSync(projects)) return;
  for (const name of readdirSync(projects)) {
    if (name.includes('e1-runs') && name.includes(runSlug)) rmSync(join(projects, name), { recursive: true, force: true });
  }
}

export function appendLog(file, line) {
  appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
}
