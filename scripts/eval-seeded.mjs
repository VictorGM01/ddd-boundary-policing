#!/usr/bin/env node
// Seeded-violation evaluation: baseline + overlay per case, run the gate, compare with expectation.
// Usage: node scripts/eval-seeded.mjs [--only <case-id-substring>]
import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const casesDir = join(root, 'experiments/seeded/cases');
const resultsDir = join(root, 'experiments/seeded/results');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const BASELINE_ENTRIES = [
  'src',
  'prisma/schema.prisma',
  'context-map.json',
  '.dependency-cruiser.cjs',
  'eslint.config.mjs',
  'tsconfig.json',
  'package.json',
  'scripts/check-arch.mjs',
];

const CATEGORIES = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'CONTROL-LEGIT'];

function loadCases() {
  return readdirSync(casesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(casesDir, d.name);
      const meta = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8'));
      if (meta.id !== d.name) throw new Error(`case.json id "${meta.id}" does not match folder "${d.name}"`);
      if (!CATEGORIES.includes(meta.category)) throw new Error(`${meta.id}: unknown category ${meta.category}`);
      if (meta.category === 'CONTROL-LEGIT' && meta.expected !== 'not_detected') {
        throw new Error(`${meta.id}: control cases must expect not_detected`);
      }
      return { ...meta, dir };
    })
    .filter((c) => !only || c.id.includes(only))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function prepareWorkspace(base, overlayDir) {
  const work = mkdtempSync(join(base, 'case-'));
  for (const entry of BASELINE_ENTRIES) {
    cpSync(join(root, entry), join(work, entry), { recursive: true });
  }
  symlinkSync(join(root, 'node_modules'), join(work, 'node_modules'), 'dir');
  if (overlayDir && existsSync(overlayDir)) {
    cpSync(overlayDir, work, { recursive: true, force: true });
  }
  return work;
}

async function runGate(work) {
  const report = join(work, 'arch-report.json');
  const started = performance.now();
  try {
    await run(process.execPath, ['scripts/check-arch.mjs', '--json', report, '--quiet'], {
      cwd: work,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    if (error.code !== 1) throw error;
  }
  const wallMs = performance.now() - started;
  return { ...JSON.parse(readFileSync(report, 'utf8')), wallMs };
}

function classify(category, detected) {
  if (category === 'CONTROL-LEGIT') return detected ? 'FP' : 'TN';
  return detected ? 'TP' : 'FN';
}

const csvEscape = (v) => {
  const s = Array.isArray(v) ? v.join(' ') : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const pct = (n, d) => (d === 0 ? '—' : `${((100 * n) / d).toFixed(1)}%`);

const base = mkdtempSync(join(tmpdir(), 'ddd-seeded-'));
try {
  const baseline = await runGate(prepareWorkspace(base, null));
  if (!baseline.passed) {
    console.error('Baseline does not pass the gate; fix it before evaluating:', baseline.violations);
    process.exit(2);
  }
  console.log(`baseline ok (${Math.round(baseline.wallMs)} ms)`);

  const cases = loadCases();
  const rows = [];
  for (const c of cases) {
    const work = prepareWorkspace(base, join(c.dir, 'files'));
    const gate = await runGate(work);
    rmSync(work, { recursive: true, force: true });

    const detected = gate.rulesFired.length > 0;
    const tools = [...new Set(gate.violations.map((v) => v.tool))].sort();
    const expectedRules = c.expectedRules ?? [];
    const row = {
      id: c.id,
      category: c.category,
      variant: c.variant ?? '',
      description: c.description,
      expected: c.expected,
      outcome: detected ? 'detected' : 'not_detected',
      classification: classify(c.category, detected),
      expectation_met: (c.expected === 'detected') === detected,
      expected_rules: expectedRules,
      rules_fired: gate.rulesFired,
      expected_rules_hit: expectedRules.every((r) => gate.rulesFired.includes(r)),
      tools,
      gate_ms: Math.round(gate.wallMs),
    };
    rows.push(row);
    const mark = row.expectation_met ? '✔' : '✖';
    console.log(`${mark} ${row.id.padEnd(48)} ${row.classification}  fired=[${row.rules_fired.join(',')}]  ${row.gate_ms} ms`);
  }

  if (only) process.exit(0);

  mkdirSync(resultsDir, { recursive: true });
  const columns = [
    'id', 'category', 'variant', 'expected', 'outcome', 'classification', 'expectation_met',
    'expected_rules', 'rules_fired', 'expected_rules_hit', 'tools', 'gate_ms', 'description',
  ];
  writeFileSync(
    join(resultsDir, 'results.csv'),
    [columns.join(','), ...rows.map((r) => columns.map((k) => csvEscape(r[k])).join(','))].join('\n') + '\n',
  );
  writeFileSync(join(resultsDir, 'summary.md'), renderSummary(rows, baseline));
  console.log(`\nwrote ${join('experiments/seeded/results', 'results.csv')} and summary.md`);
} finally {
  rmSync(base, { recursive: true, force: true });
}

function renderSummary(rows, baseline) {
  const count = (pred) => rows.filter(pred).length;
  const by = (cat) => rows.filter((r) => r.category === cat);
  const violations = rows.filter((r) => r.category !== 'CONTROL-LEGIT');
  const controls = by('CONTROL-LEGIT');
  const tp = count((r) => r.classification === 'TP');
  const fn = count((r) => r.classification === 'FN');
  const fp = count((r) => r.classification === 'FP');
  const tn = count((r) => r.classification === 'TN');
  const staticScope = violations.filter((r) => r.category !== 'V6');
  const tpStatic = staticScope.filter((r) => r.classification === 'TP').length;
  const meanGate = rows.reduce((s, r) => s + r.gate_ms, 0) / rows.length;
  const sortedGate = rows.map((r) => r.gate_ms).sort((a, b) => a - b);
  const medianGate = sortedGate[Math.floor(sortedGate.length / 2)];

  const lines = [];
  lines.push('# Avaliação com violações semeadas: resultados', '');
  lines.push('Gerado por `npm run eval:seeded`. Não edite à mão. Uma linha por caso em [results.csv](results.csv).', '');
  lines.push(`- Casos: **${rows.length}** (${violations.length} violações, ${controls.length} controles legítimos)`);
  lines.push(`- Baseline passa no gate: **sim** (${Math.round(baseline.wallMs)} ms)`);
  lines.push(`- Tempo do gate por caso: média **${Math.round(meanGate)} ms**, mediana ${medianGate} ms (dependency-cruiser + ESLint em paralelo, processo completo)`);
  lines.push(`- Data: ${new Date().toISOString().slice(0, 10)} · Node ${process.version} · ${process.platform}`, '');

  lines.push('## Matriz de confusão por categoria', '');
  lines.push('VP = violação detectada · FN = violação não detectada · FP = controle legítimo acusado · VN = controle legítimo sem alerta.', '');
  lines.push('| Categoria | Casos | VP | FN | FP | VN | Taxa de detecção |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const cat of CATEGORIES) {
    const rs = by(cat);
    if (rs.length === 0) continue;
    const c = (k) => rs.filter((r) => r.classification === k).length;
    const rate = cat === 'CONTROL-LEGIT' ? `${pct(c('TN'), rs.length)} sem alerta` : pct(c('TP'), rs.length);
    lines.push(`| ${cat} | ${rs.length} | ${c('TP')} | ${c('FN')} | ${c('FP')} | ${c('TN')} | ${rate} |`);
  }
  lines.push(`| **Total** | ${rows.length} | ${tp} | ${fn} | ${fp} | ${tn} | ${pct(tp, violations.length)} |`, '');

  lines.push('## Métricas gerais', '');
  lines.push('| Métrica | Valor |');
  lines.push('|---|---|');
  lines.push(`| Precisão (VP / (VP + FP)) | ${pct(tp, tp + fp)} |`);
  lines.push(`| Revocação (VP / (VP + FN)), V1–V6 | ${pct(tp, tp + fn)} |`);
  lines.push(`| Revocação no escopo estático (V1–V5) | ${pct(tpStatic, staticScope.length)} |`);
  lines.push(`| Especificidade nos controles (VN / (VN + FP)) | ${pct(tn, tn + fp)} |`);
  lines.push(`| Casos em que o resultado bateu com a expectativa registrada antes da execução | ${count((r) => r.expectation_met)} / ${rows.length} |`, '');

  const fns = rows.filter((r) => r.classification === 'FN');
  lines.push('## Falsos negativos', '');
  if (fns.length === 0) lines.push('Nenhum.', '');
  else {
    lines.push('| Caso | Categoria | Esperado | Descrição |', '|---|---|---|---|');
    for (const r of fns) lines.push(`| \`${r.id}\` | ${r.category} | ${r.expected} | ${r.description} |`);
    lines.push('');
  }

  const fps = rows.filter((r) => r.classification === 'FP');
  lines.push('## Falsos positivos', '');
  if (fps.length === 0) lines.push('Nenhum.', '');
  else {
    lines.push('| Caso | Regras disparadas | Descrição |', '|---|---|---|');
    for (const r of fps) lines.push(`| \`${r.id}\` | ${r.rules_fired.join(', ')} | ${r.description} |`);
    lines.push('');
  }

  const surprises = rows.filter((r) => !r.expectation_met || (r.expected === 'detected' && !r.expected_rules_hit));
  lines.push('## Divergências em relação à expectativa registrada', '');
  if (surprises.length === 0) lines.push('Nenhuma: todo caso terminou como previsto em `case.json`.', '');
  else {
    lines.push('| Caso | Esperado | Obtido | Regras esperadas | Regras disparadas |', '|---|---|---|---|---|');
    for (const r of surprises) {
      lines.push(`| \`${r.id}\` | ${r.expected} | ${r.outcome} | ${r.expected_rules.join(', ') || '—'} | ${r.rules_fired.join(', ') || '—'} |`);
    }
    lines.push('');
  }

  lines.push('## Ferramentas nos verdadeiros positivos', '');
  const tps = rows.filter((r) => r.classification === 'TP');
  const only = (t) => tps.filter((r) => r.tools.length === 1 && r.tools[0] === t).length;
  const both = tps.filter((r) => r.tools.length === 2).length;
  lines.push('| Detectado por | Casos |', '|---|---|');
  lines.push(`| só dependency-cruiser | ${only('dependency-cruiser')} |`);
  lines.push(`| só ESLint | ${only('eslint')} |`);
  lines.push(`| ambos | ${both} |`, '');

  lines.push('## Disparos por regra', '');
  const ruleCount = new Map();
  for (const r of rows) for (const rule of r.rules_fired) ruleCount.set(rule, (ruleCount.get(rule) ?? 0) + 1);
  lines.push('| Regra | Casos em que disparou |', '|---|---|');
  for (const [rule, n] of [...ruleCount].sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))) {
    lines.push(`| ${rule} | ${n} |`);
  }
  lines.push('');
  return lines.join('\n');
}
