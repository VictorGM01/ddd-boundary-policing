#!/usr/bin/env node
// E1 aggregator: experiments/e1/runs/* (+ blind ground truth, when present) → results/runs.csv and results/summary.md.
// Usage: node scripts/e1/aggregate.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGENT_MODEL, readJson, ROOT } from './lib.mjs';

const E1 = join(ROOT, 'experiments/e1');
const RESULTS = join(E1, 'results');
const ARMS = ['A', 'B', 'C'];
const CATEGORIES = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
// Which taxonomy categories each rule was written to cover (docs/regras.md, "Tabela regra a regra").
const RULE_CATEGORIES = {
  R1: ['V1', 'V2', 'V3', 'V4'],
  R2: ['V1'],
  R3: ['V5'],
  R4: ['V4', 'V5'],
  R5: ['V5'],
  R6: ['V2'],
  R7: ['V2'],
  R8: ['V3', 'V5'],
  R9: ['V3'],
  R10: ['V1', 'V3'],
  R11: ['V3', 'V5'],
  R12: ['V1', 'V5'],
  R13: ['V1', 'V3'],
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows.filter((r) => r.some((f) => f !== ''));
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function loadPlan(dirName) {
  const dir = join(E1, dirName);
  const state = readJson(join(dir, 'state.json'), null);
  if (!state) return { state: null, runs: [] };
  const runs = Object.values(state.runs)
    .sort((a, b) => a.order - b.order)
    .map((r) => {
      const runDir = join(dir, r.runId);
      return {
        ...r,
        meta: readJson(join(runDir, 'meta.json'), null),
        gate: readJson(join(runDir, 'gate.json'), null),
        acceptance: readJson(join(runDir, 'acceptance.json'), null),
        tests: readJson(join(runDir, 'tests.json'), null),
      };
    });
  return { state, runs };
}

// ---------- statistics (exploratory) ----------
function logFact(n) {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}
// Two-sided Fisher exact test for [[a, b], [c, d]] (rows: arm, columns: ≥1 violation / none).
function fisherExact(a, b, c, d) {
  const n = a + b + c + d;
  const r1 = a + b;
  const c1 = a + c;
  const p = (x) => Math.exp(logFact(r1) + logFact(n - r1) + logFact(c1) + logFact(n - c1) - logFact(n) - logFact(x) - logFact(r1 - x) - logFact(c1 - x) - logFact(n - r1 - c1 + x));
  const observed = p(a);
  let two = 0;
  let less = 0;
  let greater = 0;
  for (let x = Math.max(0, c1 + r1 - n); x <= Math.min(r1, c1); x++) {
    const px = p(x);
    if (px <= observed * (1 + 1e-7)) two += px;
    if (x <= a) less += px;
    if (x >= a) greater += px;
  }
  return { two: Math.min(1, two), less: Math.min(1, less), greater: Math.min(1, greater) };
}

function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// Mann-Whitney U with normal approximation, tie and continuity correction. `greater` tests x > y.
function mannWhitney(x, y) {
  const all = [...x.map((v) => ({ v, g: 0 })), ...y.map((v) => ({ v, g: 1 }))].sort((p, q) => p.v - q.v);
  const ranks = new Array(all.length);
  const ties = [];
  for (let i = 0; i < all.length; ) {
    let j = i;
    while (j + 1 < all.length && all[j + 1].v === all[i].v) j++;
    for (let k = i; k <= j; k++) ranks[k] = (i + j) / 2 + 1;
    ties.push(j - i + 1);
    i = j + 1;
  }
  const n1 = x.length;
  const n2 = y.length;
  if (!n1 || !n2) return null;
  const r1 = all.reduce((s, item, i) => s + (item.g === 0 ? ranks[i] : 0), 0);
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const n = n1 + n2;
  const tieTerm = ties.reduce((s, t) => s + (t ** 3 - t), 0) / (n * (n - 1));
  const sigma = Math.sqrt(((n1 * n2) / 12) * (n + 1 - tieTerm));
  const mu = (n1 * n2) / 2;
  if (sigma === 0) return { u: u1, z: 0, greater: 1, two: 1 };
  const zGreater = (u1 - mu - 0.5) / sigma;
  const zTwo = (Math.abs(u1 - mu) - 0.5) / sigma;
  return { u: u1, z: (u1 - mu) / sigma, greater: 1 - normalCdf(zGreater), two: Math.min(1, 2 * (1 - normalCdf(zTwo))) };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');
const num = (v, digits = 2) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(digits));
const fmtP = (p) => (p === null || p === undefined ? '—' : p < 0.001 ? '< 0.001' : p.toFixed(3));
const int = (v) => (v === null || v === undefined ? '—' : Math.round(v).toLocaleString('en-US'));

// ---------- ground truth ----------
function loadGroundTruth() {
  const labelsFile = join(E1, 'blind/labels.csv');
  const mappingFile = join(E1, 'blind-mapping.json');
  if (!existsSync(labelsFile) || !existsSync(mappingFile)) return null;
  const mapping = readJson(mappingFile, {});
  const byRun = {};
  const declared = [];
  for (const row of parseCsv(readFileSync(labelsFile, 'utf8'))) {
    const runId = mapping[row.blind_id];
    if (!runId) continue;
    byRun[runId] ??= [];
    if (!CATEGORIES.includes(row.category)) continue;
    // Labelers never see context-map.json (it would reveal the arm), so they tag every relation outside
    // the baseline map as V1.b-new-relation:<from>-><to>; it is a violation only if the run did not declare it (notes read provider → consumer).
    const rel = /^V1\.b-new-relation:\s*([\w-]+)\s*->\s*([\w-]+)/i.exec(row.subcategory ?? '');
    if (rel) {
      const notes = readJson(join(E1, 'runs', runId, 'meta.json'), {}).restoreNotes ?? [];
      if (notes.includes(`relation declared by agent: ${rel[2]} → ${rel[1]}`)) {
        declared.push({ runId, ...row });
        continue;
      }
      row.subcategory = 'V1.b-undeclared-relation';
    }
    byRun[runId].push(row);
  }
  const labelled = new Set(parseCsv(readFileSync(labelsFile, 'utf8')).map((r) => mapping[r.blind_id]).filter(Boolean));
  return { byRun, labelled, declared };
}

// A ground-truth violation counts as detected when the gate flagged the same file with a rule that
// covers its category. Gate violations that match no labelled violation are false positives.
// Both tools often report the same import; an alert is one (rule, file) pair.
function matchGate(gtViolations, rawGate) {
  const seen = new Set();
  const gateViolations = rawGate.filter((g) => {
    const key = `${g.rule}|${normPath(g.file)}`;
    return seen.has(key) ? false : seen.add(key);
  });
  const usedGate = new Set();
  const matched = gtViolations.map((v) => {
    const idx = gateViolations.findIndex((g) => normPath(g.file) === normPath(v.file) && (RULE_CATEGORIES[g.rule] ?? []).includes(v.category));
    gateViolations.forEach((g, i) => {
      if (normPath(g.file) === normPath(v.file) && (RULE_CATEGORIES[g.rule] ?? []).includes(v.category)) usedGate.add(i);
    });
    return { ...v, detected: idx >= 0 };
  });
  const labelledFiles = new Set(gtViolations.map((v) => normPath(v.file)));
  const fp = gateViolations.filter((_, i) => !usedGate.has(i)).map((g) => ({ ...g, inLabelledFile: labelledFiles.has(normPath(g.file)) }));
  return { matched, fp, alerts: gateViolations.length };
}
const normPath = (p) => String(p ?? '').replace(/^\.?\//, '').trim();

function seededRates() {
  const file = join(ROOT, 'experiments/seeded/results/results.csv');
  if (!existsSync(file)) return {};
  const rates = {};
  for (const row of parseCsv(readFileSync(file, 'utf8'))) {
    if (!CATEGORIES.includes(row.category)) continue;
    rates[row.category] ??= { tp: 0, n: 0 };
    rates[row.category].n++;
    if (row.classification === 'TP') rates[row.category].tp++;
  }
  return rates;
}

function machine() {
  const sh = (c, a) => spawnSync(c, a, { encoding: 'utf8' }).stdout.trim();
  return {
    model: sh('sysctl', ['-n', 'hw.model']),
    chip: sh('sysctl', ['-n', 'machdep.cpu.brand_string']),
    ramGb: Math.round(Number(sh('sysctl', ['-n', 'hw.memsize'])) / 1024 ** 3),
    os: `macOS ${sh('sw_vers', ['-productVersion'])}`,
    node: process.version,
  };
}

function resources(runs) {
  const done = runs.filter((r) => r.status === 'done' && r.meta);
  const sum = (f) => done.reduce((s, r) => s + (f(r) ?? 0), 0);
  return {
    runs: done.length,
    input: sum((r) => r.meta.tokens.input),
    output: sum((r) => r.meta.tokens.output),
    cacheRead: sum((r) => r.meta.tokens.cacheRead),
    cacheCreation: sum((r) => r.meta.tokens.cacheCreation),
    cost: sum((r) => r.meta.costUsd),
    durationMs: sum((r) => r.meta.wallMs),
    turns: sum((r) => r.meta.numTurns),
  };
}

// ---------- main ----------
mkdirSync(RESULTS, { recursive: true });
const main = loadPlan('runs');
const pilot = loadPlan('pilot');
const gt = loadGroundTruth();
const seeded = seededRates();

const rows = main.runs.map((r) => {
  const m = r.meta;
  const gateViolations = r.gate?.violations ?? [];
  const gtViolations = gt?.byRun[r.runId] ?? [];
  const labelled = gt?.labelled.has(r.runId) ?? false;
  const { matched, fp, alerts } = labelled ? matchGate(gtViolations, gateViolations) : { matched: [], fp: [], alerts: 0 };
  return {
    run: r,
    labelled,
    gtViolations: matched,
    gateFp: fp,
    gateAlerts: alerts,
    csv: {
      run_id: r.runId,
      task: r.task,
      arm: r.arm,
      rep: r.rep,
      status: r.status,
      attempts: r.attempts,
      stop_reason: m?.stopReason ?? '',
      num_turns: m?.numTurns ?? '',
      duration_s: m ? Math.round(m.wallMs / 1000) : '',
      cost_usd: m ? m.costUsd?.toFixed(4) : '',
      input_tokens: m?.tokens.input ?? '',
      output_tokens: m?.tokens.output ?? '',
      cache_read_tokens: m?.tokens.cacheRead ?? '',
      cache_creation_tokens: m?.tokens.cacheCreation ?? '',
      acceptance_passed: r.acceptance ? r.acceptance.passed : '',
      acceptance_score: r.acceptance ? `${r.acceptance.numPassed}/${r.acceptance.numTotal}` : '',
      npm_test_passed: r.tests ? r.tests.passed : '',
      typecheck_passed: r.tests ? r.tests.typecheckPassed : '',
      gate_passed: r.gate ? r.gate.passed : '',
      gate_violations: r.gate ? gateViolations.length : '',
      gate_rules: r.gate ? (r.gate.rulesFired ?? []).join(' ') : '',
      gate_runs_by_agent: m?.gateRunsByAgent ?? '',
      files_changed: m ? m.filesChanged.length : '',
      context_map_declared: m ? (m.restoreNotes ?? []).filter((n) => n.startsWith('relation declared')).length : '',
      gt_labelled: labelled,
      gt_violations: labelled ? matched.length : '',
      gt_categories: labelled ? [...new Set(matched.map((v) => v.category))].join(' ') : '',
      gt_detected: labelled ? matched.filter((v) => v.detected).length : '',
      gate_false_positives: labelled ? fp.length : '',
    },
  };
});

const header = Object.keys(rows[0]?.csv ?? { run_id: '' });
writeFileSync(join(RESULTS, 'runs.csv'), [header.join(','), ...rows.map((r) => header.map((h) => csvCell(r.csv[h])).join(','))].join('\n') + '\n');

const doneRows = rows.filter((r) => r.run.status === 'done' && r.run.meta);
const armsPresent = ARMS.filter((a) => doneRows.some((r) => r.run.arm === a));
const gtReady = gt && doneRows.every((r) => r.labelled);
const out = [];
const w = (...lines) => out.push(...lines);

w(
  '# E1: resultados',
  '',
  'Gerado por `node scripts/e1/aggregate.mjs` (também chamado ao fim de `npm run e1 -- --plan`). Não edite à mão. Uma linha por execução em [runs.csv](runs.csv). Protocolo em [../protocolo.md](../protocolo.md).',
  '',
  `- Execuções planejadas: **${main.runs.length}** · concluídas: **${doneRows.length}** · falhadas: **${main.runs.filter((r) => r.status === 'failed').length}** · não executadas: **${main.runs.filter((r) => !['done', 'failed'].includes(r.status)).length}**`,
  `- Modelo do agente: \`${AGENT_MODEL}\` · Claude Code ${[...new Set(doneRows.map((r) => r.run.meta.claudeCodeVersion))].join(', ') || '—'} · semente da ordem: ${main.state?.seed ?? '—'}`,
  `- Ground truth cego: ${gtReady ? `**completo** (${doneRows.length} diffs rotulados)` : gt ? `parcial (${doneRows.filter((r) => r.labelled).length} de ${doneRows.length} diffs rotulados)` : '**pendente** (as seções que dependem dele ficam vazias)'}`,
  `- Relações novas entre contextos rotuladas e **declaradas** pelo agente no mapa (não contam como violação): ${gt?.declared.length ? gt.declared.map((d) => `${d.runId} (${d.subcategory.replace(/^V1\.b-new-relation:\s*/i, '')})`).join(', ') : 'nenhuma'}`,
  '',
);

// Per-arm table
w('## Por braço', '', '| Braço | Execuções | ≥1 violação (ground truth) | Violações/execução, média (mediana) | Gate reprovou | Violações do gate/execução, média | Aceite completo | `npm test` verde | Custo eq. médio | Duração média | Turnos médios |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const arm of armsPresent) {
  const rs = doneRows.filter((r) => r.run.arm === arm);
  const gtCounts = rs.filter((r) => r.labelled).map((r) => r.gtViolations.length);
  const gateCounts = rs.map((r) => r.run.gate?.violations?.length ?? 0);
  w(
    `| ${arm} | ${rs.length} | ${gtCounts.length ? `${gtCounts.filter((c) => c > 0).length}/${gtCounts.length} (${pct(gtCounts.filter((c) => c > 0).length, gtCounts.length)})` : '—'} | ${gtCounts.length ? `${num(mean(gtCounts))} (${num(median(gtCounts), 1)})` : '—'} | ${rs.filter((r) => r.run.gate && !r.run.gate.passed).length}/${rs.length} (${pct(rs.filter((r) => r.run.gate && !r.run.gate.passed).length, rs.length)}) | ${num(mean(gateCounts))} | ${rs.filter((r) => r.run.acceptance?.passed).length}/${rs.length} | ${rs.filter((r) => r.run.tests?.passed).length}/${rs.length} | $${num(mean(rs.map((r) => r.run.meta.costUsd)))} | ${num(mean(rs.map((r) => r.run.meta.wallMs / 60000)), 1)} min | ${num(mean(rs.map((r) => r.run.meta.numTurns)), 1)} |`,
  );
}
w('', 'Aceite completo = todos os testes de aceite ocultos da tarefa passaram. Violações do gate contam cada ocorrência reportada (a mesma linha pode aparecer nas duas ferramentas).', '');

// Category × arm
if (gt) {
  w('## Violações por categoria × braço (ground truth)', '', `| Categoria | ${armsPresent.join(' | ')} |`, `|---|${armsPresent.map(() => '---').join('|')}|`);
  for (const cat of CATEGORIES) {
    w(`| ${cat} | ${armsPresent.map((arm) => doneRows.filter((r) => r.run.arm === arm).reduce((s, r) => s + r.gtViolations.filter((v) => v.category === cat).length, 0)).join(' | ')} |`);
  }
  w(`| **Total** | ${armsPresent.map((arm) => doneRows.filter((r) => r.run.arm === arm).reduce((s, r) => s + r.gtViolations.length, 0)).join(' | ')} |`, '');

  w('## Violações por tarefa × braço (ground truth: total de violações / execuções com ≥1)', '', `| Tarefa | ${armsPresent.join(' | ')} |`, `|---|${armsPresent.map(() => '---').join('|')}|`);
  for (const task of [...new Set(doneRows.map((r) => r.run.task))].sort()) {
    w(
      `| ${task} | ${armsPresent
        .map((arm) => {
          const rs = doneRows.filter((r) => r.run.arm === arm && r.run.task === task && r.labelled);
          return rs.length ? `${rs.reduce((s, r) => s + r.gtViolations.length, 0)} / ${rs.filter((r) => r.gtViolations.length).length} de ${rs.length}` : '—';
        })
        .join(' | ')} |`,
    );
  }
  w('');
}

w('## Gate por tarefa × braço (execuções reprovadas / execuções)', '', `| Tarefa | ${armsPresent.join(' | ')} |`, `|---|${armsPresent.map(() => '---').join('|')}|`);
for (const task of [...new Set(doneRows.map((r) => r.run.task))].sort()) {
  w(`| ${task} | ${armsPresent.map((arm) => {
    const rs = doneRows.filter((r) => r.run.arm === arm && r.run.task === task);
    return rs.length ? `${rs.filter((r) => r.run.gate && !r.run.gate.passed).length}/${rs.length}` : '—';
  }).join(' | ')} |`);
}
const ruleCounts = {};
for (const r of doneRows) for (const rule of r.run.gate?.rulesFired ?? []) ruleCounts[rule] = (ruleCounts[rule] ?? 0) + 1;
w('', `Regras disparadas (execuções): ${Object.entries(ruleCounts).sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1))).map(([k, v]) => `${k} ${v}`).join(' · ') || 'nenhuma'}.`, '');

// Detection vs ground truth
if (gt) {
  w(
    '## Detecção do gate contra o ground truth',
    '',
    'Uma violação rotulada conta como detectada (VP) quando o gate acusou o mesmo arquivo com uma regra que cobre a categoria (mapeamento regra → categorias de `docs/regras.md`). Alertas do gate que não casam com nenhuma violação rotulada contam como falsos positivos (FP).',
    '',
    '| Categoria | Violações reais (agente) | VP | FN | Detecção (agente) | Detecção (avaliação semeada) |',
    '|---|---|---|---|---|---|',
  );
  const all = doneRows.flatMap((r) => r.gtViolations);
  for (const cat of CATEGORIES) {
    const vs = all.filter((v) => v.category === cat);
    const tp = vs.filter((v) => v.detected).length;
    const s = seeded[cat];
    w(`| ${cat} | ${vs.length} | ${tp} | ${vs.length - tp} | ${vs.length ? pct(tp, vs.length) : '—'} | ${s ? `${pct(s.tp, s.n)} (${s.tp}/${s.n})` : '—'} |`);
  }
  const tpAll = all.filter((v) => v.detected).length;
  const fpAll = doneRows.reduce((s, r) => s + r.gateFp.length, 0);
  w(
    `| **Total** | ${all.length} | ${tpAll} | ${all.length - tpAll} | ${pct(tpAll, all.length)} | ${pct(Object.values(seeded).reduce((s, x) => s + x.tp, 0), Object.values(seeded).reduce((s, x) => s + x.n, 0))} |`,
    '',
    `- Alertas do gate, contados uma vez por par (regra, arquivo) mesmo quando as duas ferramentas acusam: **${doneRows.reduce((s, r) => s + r.gateAlerts, 0)}**. Sem violação rotulada correspondente (FP): **${fpAll}** em ${doneRows.filter((r) => r.gateFp.length).length} execução(ões).`,
    `- Dos FP, **${doneRows.reduce((s, r) => s + r.gateFp.filter((g) => g.inLabelledFile).length, 0)}** estão num arquivo que tem violação rotulada de outra categoria (o gate acusou o lugar certo com uma regra que não cobre a categoria do rótulo) e **${doneRows.reduce((s, r) => s + r.gateFp.filter((g) => !g.inLabelledFile).length, 0)}** em arquivo sem violação rotulada: ${[...new Set(doneRows.flatMap((r) => r.gateFp.filter((g) => !g.inLabelledFile).map((g) => `${r.run.runId} ${g.rule} \`${normPath(g.file)}\``)))].join('; ') || '—'}.`,
  );
  const fpRules = {};
  for (const r of doneRows) for (const g of r.gateFp) fpRules[g.rule] = (fpRules[g.rule] ?? 0) + 1;
  if (fpAll) w(`- FP por regra: ${Object.entries(fpRules).map(([k, v]) => `${k} ${v}`).join(' · ')}.`);
  const runLevel = doneRows.filter((r) => r.gtViolations.length);
  w(`- Nível de execução: das ${runLevel.length} execuções com ≥1 violação rotulada, o gate reprovou ${runLevel.filter((r) => r.run.gate && !r.run.gate.passed).length}; das ${doneRows.length - runLevel.length} sem violação rotulada, o gate reprovou ${doneRows.filter((r) => !r.gtViolations.length && r.run.gate && !r.run.gate.passed).length}.`, '');
  const v4 = all.filter((v) => v.category === 'V4');
  const v6 = all.filter((v) => v.category === 'V6');
  w(
    '**H3** (detecção abaixo da semeada em V4 e V6): ' +
      `V4 ${v4.length ? pct(v4.filter((v) => v.detected).length, v4.length) : 'sem ocorrências'} no agente vs. ${seeded.V4 ? pct(seeded.V4.tp, seeded.V4.n) : '—'} na semeada; ` +
      `V6 ${v6.length ? pct(v6.filter((v) => v.detected).length, v6.length) : 'sem ocorrências'} no agente vs. ${seeded.V6 ? pct(seeded.V6.tp, seeded.V6.n) : '—'} na semeada. ` +
      'Com V6 a 0% na semeada, "abaixo" é impossível por construção; o teste efetivo de H3 é em V4.',
    '',
  );
}

// Hypothesis tests
w('## Testes exploratórios de H1 e H2', '');
w('> **Aviso.** n pequeno (no máximo 18 execuções por braço, 3 por célula). Os p-valores são exploratórios, sem correção para comparações múltiplas, e não sustentam afirmação de significância. O que importa é a direção e o tamanho do efeito descritivo, lidos junto com as tabelas acima.', '');
const testRows = [];
const addTests = (label, countOf, eligible) => {
  const a = doneRows.filter((r) => r.run.arm === 'A' && eligible(r)).map(countOf);
  const b = doneRows.filter((r) => r.run.arm === 'B' && eligible(r)).map(countOf);
  if (!a.length || !b.length) return;
  const aHit = a.filter((c) => c > 0).length;
  const bHit = b.filter((c) => c > 0).length;
  const f = fisherExact(aHit, a.length - aHit, bHit, b.length - bHit);
  const mw = mannWhitney(a, b);
  testRows.push(
    `| ${label} | A ${aHit}/${a.length} · B ${bHit}/${b.length} | ${fmtP(f.greater)} | ${fmtP(f.two)} | A ${num(mean(a))} · B ${num(mean(b))} | ${num(mw.u, 1)} | ${num(mw.z)} | ${fmtP(mw.greater)} | ${fmtP(mw.two)} |`,
  );
};
if (gt) {
  addTests('Ground truth (todas as categorias)', (r) => r.gtViolations.length, (r) => r.labelled);
  addTests('Ground truth sem V1.b de relação nova não declarada', (r) => r.gtViolations.filter((v) => v.subcategory !== 'V1.b-undeclared-relation').length, (r) => r.labelled);
}
addTests('Gate (violações reportadas)', (r) => r.run.gate?.violations?.length ?? 0, () => true);
if (testRows.length) {
  w(
    '| Medida | Execuções com ≥1 violação | Fisher, unilateral (A > B), p | Fisher, bilateral, p | Violações/execução, média | U de Mann-Whitney | z | MW unilateral (A > B), p | MW bilateral, p |',
    '|---|---|---|---|---|---|---|---|---|',
    ...testRows,
    '',
    'H1 usa a coluna de Fisher (proporção de execuções com ≥1 violação); H2 usa Mann-Whitney (violações por execução). Mann-Whitney com aproximação normal, correção de empates e de continuidade.',
    '',
  );
} else w('Sem dados dos dois braços ainda.', '');

// Resources
const res = resources(main.runs);
const pres = resources(pilot.runs);
const m = machine();
const retries = main.runs.reduce((s, r) => s + (r.history ?? []).filter((h) => h.outcome === 'failure' || h.outcome === 'interrupted').length, 0);
const wall = main.state?.startedAt && main.state?.finishedAt ? new Date(main.state.finishedAt) - new Date(main.state.startedAt) : null;
w(
  '## Recursos utilizados',
  '',
  'Tokens e custo vêm da saída JSON do Claude Code (`total_cost_usd` e `usage` do evento `result`). **O custo é uma estimativa calculada a preço de API: as execuções usaram a assinatura do aluno (login do Claude Code), então não é um valor efetivamente pago.**',
  '',
  `| | Execuções | Tokens de entrada | Tokens de saída | Cache (leitura) | Cache (escrita) | Custo eq. (US$) | Soma das durações | Turnos |`,
  '|---|---|---|---|---|---|---|---|---|',
);
for (const arm of armsPresent) {
  const r = resources(main.runs.filter((x) => x.arm === arm));
  w(`| Braço ${arm} | ${r.runs} | ${int(r.input)} | ${int(r.output)} | ${int(r.cacheRead)} | ${int(r.cacheCreation)} | ${num(r.cost)} | ${num(r.durationMs / 3_600_000)} h | ${int(r.turns)} |`);
}
w(
  `| **Total do plano** | ${res.runs} | ${int(res.input)} | ${int(res.output)} | ${int(res.cacheRead)} | ${int(res.cacheCreation)} | ${num(res.cost)} | ${num(res.durationMs / 3_600_000)} h | ${int(res.turns)} |`,
  `| Piloto (fora dos resultados) | ${pres.runs} | ${int(pres.input)} | ${int(pres.output)} | ${int(pres.cacheRead)} | ${int(pres.cacheCreation)} | ${num(pres.cost)} | ${num(pres.durationMs / 3_600_000)} h | ${int(pres.turns)} |`,
  '',
  `- Tempo de parede do plano: ${wall ? `${num(wall / 3_600_000)} h` : '—'} (concorrência ${main.state?.spec ? 2 : '—'}; inclui avaliação, pausas e o intervalo ocioso de cerca de 12 h entre o fim de A+B e o início do braço C, ADR-024). Soma das durações das execuções do agente: ${num(res.durationMs / 3_600_000)} h.`,
  `- Execuções refeitas (falha ou interrupção antes de concluir): ${retries}. Pausas por limite de uso: ${main.state?.pauses?.length ?? 0}.`,
  `- Máquina: ${m.model}, ${m.chip}, ${m.ramGb} GB de RAM, ${m.os}, Node ${m.node}, Claude Code ${[...new Set(doneRows.map((r) => r.run.meta.claudeCodeVersion))].join(', ') || '—'}.`,
  '- O consumo da sessão orquestradora (a sessão do Claude Code que montou o harness, rodou o piloto e fez a rotulagem) **não é medido pelo harness** e não está nos números acima.',
  '',
);

// Examples
if (gt) {
  w('## Exemplos', '', 'Trechos reais de violação do braço A (rotulagem cega) e o que o braço B fez na mesma tarefa.', '');
  const aViolations = doneRows.filter((r) => r.run.arm === 'A').flatMap((r) => r.gtViolations.map((v) => ({ ...v, run: r.run })));
  const picked = [];
  for (const cat of CATEGORIES) {
    const v = aViolations.find((x) => x.category === cat && !picked.some((p) => p.run.task === x.run.task));
    if (v) picked.push(v);
  }
  for (const v of aViolations) if (picked.length < 3 && !picked.includes(v)) picked.push(v);
  for (const v of picked.slice(0, 5)) {
    const bRuns = doneRows.filter((r) => r.run.arm === 'B' && r.run.task === v.run.task);
    w(
      `### ${v.run.runId} · ${v.category}${v.subcategory ? ` (${v.subcategory})` : ''} · ${v.detected ? 'detectada pelo gate' : 'não detectada pelo gate'}`,
      '',
      `\`${v.file}\``,
      '',
      '```ts',
      v.excerpt.trim(),
      '```',
      '',
      `Justificativa da rotulagem: ${v.justification}`,
      '',
      `Braço B na mesma tarefa: ${bRuns.map((r) => `${r.run.runId} com ${r.gtViolations.length} violação(ões) rotulada(s)${r.gtViolations.length ? ` (${[...new Set(r.gtViolations.map((x) => x.category))].join(', ')})` : ''}, gate ${r.run.gate?.passed ? 'aprovado' : 'reprovado'}${(r.run.meta.restoreNotes ?? []).some((n) => n.startsWith('relation declared')) ? ', declarou relação nova no mapa' : ''}`).join('; ') || '—'}.`,
      '',
    );
    const b = bRuns.find((r) => !r.gtViolations.length) ?? bRuns[0];
    if (b) {
      const files = b.run.meta.filesChanged.map((f) => `\`${f.path}\``).slice(0, 12).join(', ');
      w(`Arquivos alterados em ${b.run.runId}: ${files}.`, '');
    }
  }
}

w(
  '## Ameaças à validade',
  '',
  '- **Um só estudo de caso.** Um protótipo pequeno (4 contextos), escrito para o estudo. O comportamento do agente em bases maiores e menos regulares pode ser outro.',
  `- **Um só modelo e uma só ferramenta.** Todas as execuções usam \`${AGENT_MODEL}\` no Claude Code, com esforço e limites fixos. Outros modelos e agentes podem errar mais, menos ou de outro jeito.`,
  '- **n pequeno.** 3 repetições por célula; os testes estatísticos são exploratórios.',
  '- **Rotulagem por LLM.** O ground truth foi produzido por subagentes de um modelo de linguagem, cegos para braço, tarefa e gate, e não por humanos. Há uma amostra para revisão humana em `blind/revisao-humana.md`. A cegueira é imperfeita: `context-map.json` foi retirado dos diffs (ADR-024), mas um comentário ou o estilo da solução ainda pode denunciar o braço.',
  '- **Tarefas e regras do mesmo autor.** As tarefas do backlog foram desenhadas por quem desenhou as regras, com a tentação de violação em mente.',
  '- **Não determinismo.** O mesmo prompt produz soluções diferentes; a variância entre repetições é parte do resultado.',
  '- **Critério de detecção por arquivo e categoria.** Uma violação conta como detectada quando o gate acusa o mesmo arquivo com uma regra que cobre a categoria; isso pode superestimar a detecção quando o arquivo tem várias violações.',
  '- **Testes de aceite parciais.** T2 não verifica o preço de uma prescrição precificada e T4 não verifica fatura paga (o enunciado não define essas interfaces); T3 e T6 aceitam formatos de resposta variados.',
  '- **Critérios de aceite fora do enunciado.** Um teste de T2 (prescrição sem preço não impede as demais linhas) e um de T6 (quem ainda espera entra no máximo) verificam critérios que estão só no backlog em português, não no enunciado em inglês dado ao agente; falham em todos os braços (ADR-024). Não enviesam a comparação entre braços, mas o aceite completo dessas tarefas não mede o que o agente foi pedido a fazer.',
  '- **Braço C em outro horário.** O braço C rodou cerca de 12 horas depois de A+B (ADR-024); a comparação B×C supõe que o serviço do modelo não mudou nesse intervalo.',
  '',
);

writeFileSync(join(RESULTS, 'summary.md'), out.join('\n'));
console.log(`wrote ${join(RESULTS, 'runs.csv')} and ${join(RESULTS, 'summary.md')} (${doneRows.length} runs, ground truth ${gtReady ? 'complete' : gt ? 'partial' : 'pending'})`);
