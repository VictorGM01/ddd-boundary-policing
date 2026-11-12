#!/usr/bin/env node
// Blind ground truth for E1.
//   node scripts/e1/blind.mjs --prepare   copy each diff to blind/<random-id>.patch; mapping goes to blind-mapping.json (outside blind/)
//   node scripts/e1/blind.mjs --merge     merge blind/labels-*.csv (one per labeler batch) into blind/labels.csv
//   node scripts/e1/blind.mjs --review    write blind/revisao-humana.md with a sample of ~10 labelled diffs
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, ROOT, writeJsonAtomic } from './lib.mjs';

const E1 = join(ROOT, 'experiments/e1');
const BLIND = join(E1, 'blind');
const MAPPING = join(E1, 'blind-mapping.json');
const HEADER = 'blind_id,violation_id,category,subcategory,file,excerpt,justification';
const argv = process.argv.slice(2);
mkdirSync(BLIND, { recursive: true });

function prepare() {
  const state = readJson(join(E1, 'runs/state.json'), null);
  if (!state) throw new Error('no runs/state.json');
  const mapping = readJson(MAPPING, {});
  const known = new Set(Object.values(mapping));
  const fresh = Object.values(state.runs).filter((r) => r.status === 'done' && !known.has(r.runId) && existsSync(join(E1, 'runs', r.runId, 'diff.patch')));
  // Shuffle so the id order says nothing about plan order.
  fresh.sort(() => randomBytes(1)[0] - 128);
  for (const run of fresh) {
    let id;
    do id = `d-${randomBytes(3).toString('hex')}`;
    while (mapping[id]);
    mapping[id] = run.runId;
    writeFileSync(join(BLIND, `${id}.patch`), readFileSync(join(E1, 'runs', run.runId, 'diff.patch'), 'utf8'));
  }
  writeJsonAtomic(MAPPING, mapping);
  console.log(`${fresh.length} new blind diffs; ${Object.keys(mapping).length} in total`);
}

function merge() {
  const parts = readdirSync(BLIND).filter((f) => /^labels-.+\.csv$/.test(f)).sort();
  const lines = [HEADER];
  for (const f of parts) {
    const body = readFileSync(join(BLIND, f), 'utf8').trim().split('\n');
    if (body[0].trim() !== HEADER) throw new Error(`${f}: unexpected header`);
    lines.push(...body.slice(1).filter((l) => l.trim()));
  }
  writeFileSync(join(BLIND, 'labels.csv'), `${lines.join('\n')}\n`);
  const ids = readdirSync(BLIND).filter((f) => f.endsWith('.patch')).map((f) => f.replace('.patch', ''));
  const labelled = new Set(lines.slice(1).map((l) => l.split(',')[0]));
  const missing = ids.filter((id) => !labelled.has(id));
  console.log(`merged ${parts.length} file(s), ${lines.length - 1} rows; diffs without labels: ${missing.join(', ') || 'none'}`);
}

function review() {
  const labels = readFileSync(join(BLIND, 'labels.csv'), 'utf8').trim().split('\n').slice(1);
  const byId = {};
  for (const l of labels) (byId[l.split(',')[0]] ??= []).push(l);
  const ids = Object.keys(byId).sort();
  // Deterministic sample: every k-th id, so it mixes diffs with and without violations.
  const k = Math.max(1, Math.floor(ids.length / 10));
  const sample = ids.filter((_, i) => i % k === 0).slice(0, 10);
  const md = [
    '# Revisão humana da rotulagem cega',
    '',
    'Amostra determinística (um a cada k diffs, em ordem de id) dos diffs rotulados pelos subagentes. Para cada um, abra o `.patch`, confira as violações rotuladas e anote se concorda, se falta alguma ou se alguma não é violação. O mapeamento para braço e tarefa está em `../blind-mapping.json`; abra-o só depois de revisar, para não enviesar a revisão.',
    '',
    ...sample.flatMap((id) => [
      `## ${id} · [${id}.patch](${id}.patch)`,
      '',
      '```csv',
      HEADER,
      ...byId[id],
      '```',
      '',
      '- [ ] concordo com todos os rótulos',
      '- Violações que faltam: ',
      '- Rótulos que não são violação: ',
      '',
    ]),
  ];
  writeFileSync(join(BLIND, 'revisao-humana.md'), md.join('\n'));
  console.log(`wrote revisao-humana.md with ${sample.length} diffs`);
}

if (argv.includes('--prepare')) prepare();
else if (argv.includes('--merge')) merge();
else if (argv.includes('--review')) review();
else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 5).join('\n'));
