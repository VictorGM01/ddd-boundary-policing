#!/usr/bin/env node
// Architecture gate: dependency-cruiser + ESLint, normalized by rule id.
// Usage: node scripts/check-arch.mjs [--json <file>] [--quiet]
import { execFile } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ESLint } from 'eslint';

const run = promisify(execFile);
const cwd = process.cwd();
const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const quiet = args.includes('--quiet');

const RULE_TAG = /\[(R\d+)\]/;

async function runDependencyCruiser() {
  const started = performance.now();
  const bin = resolve(cwd, 'node_modules/.bin/depcruise');
  let stdout;
  try {
    ({ stdout } = await run(bin, ['src', '--config', '.dependency-cruiser.cjs', '--output-type', 'json'], {
      cwd,
      maxBuffer: 64 * 1024 * 1024,
    }));
  } catch (error) {
    if (!error.stdout) throw error;
    stdout = error.stdout;
  }
  const result = JSON.parse(stdout);
  const violations = result.summary.violations.map((v) => ({
    rule: v.rule.name.split('-')[0],
    tool: 'dependency-cruiser',
    check: v.rule.name,
    file: v.from,
    line: null,
    detail: v.cycle ? `cycle: ${[v.from, ...v.cycle.map((c) => c.name ?? c)].join(' → ')}` : `→ ${v.to}`,
  }));
  return { violations, ms: performance.now() - started };
}

async function runEslint() {
  const started = performance.now();
  const eslint = new ESLint({ cwd });
  const results = await eslint.lintFiles(['src']);
  const violations = [];
  for (const result of results) {
    for (const message of result.messages) {
      if (message.fatal) {
        violations.push({
          rule: 'PARSE',
          tool: 'eslint',
          check: 'parse-error',
          file: relative(cwd, result.filePath),
          line: message.line ?? null,
          detail: message.message,
        });
        continue;
      }
      const tag = RULE_TAG.exec(message.message);
      if (!tag) continue;
      violations.push({
        rule: tag[1],
        tool: 'eslint',
        check: message.ruleId,
        file: relative(cwd, result.filePath),
        line: message.line,
        detail: message.message.replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return { violations, ms: performance.now() - started };
}

const started = performance.now();
const [depcruise, eslint] = await Promise.all([runDependencyCruiser(), runEslint()]);
const durationMs = performance.now() - started;
const violations = [...depcruise.violations, ...eslint.violations].sort(
  (a, b) => Number(a.rule.slice(1)) - Number(b.rule.slice(1)) || a.file.localeCompare(b.file),
);

if (jsonOut) {
  writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        passed: violations.length === 0,
        durationMs: Math.round(durationMs),
        dependencyCruiserMs: Math.round(depcruise.ms),
        eslintMs: Math.round(eslint.ms),
        rulesFired: [...new Set(violations.map((v) => v.rule))].sort(),
        violations,
      },
      null,
      2,
    ),
  );
}

if (!quiet) {
  if (violations.length === 0) {
    console.log('✔ architecture gate passed: no boundary violations');
  } else {
    console.log(`✖ architecture gate failed: ${violations.length} violation(s)\n`);
    let current = null;
    for (const v of violations) {
      if (v.rule !== current) {
        current = v.rule;
        console.log(`${v.rule}`);
      }
      const where = v.line ? `${v.file}:${v.line}` : v.file;
      console.log(`  [${v.tool}] ${where}  ${v.detail}`);
    }
  }
  console.log(
    `\ngate time: ${Math.round(durationMs)} ms (dependency-cruiser ${Math.round(depcruise.ms)} ms, eslint ${Math.round(eslint.ms)} ms, in parallel)`,
  );
}

process.exit(violations.length === 0 ? 0 : 1);
