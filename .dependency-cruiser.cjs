/** @type {import('dependency-cruiser').IConfiguration} */
const { contexts } = require('./context-map.json');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const contractsAllowedFor = (name) => {
  const ctx = contexts[name];
  const own = ctx.publishes ? [ctx.publishes] : [];
  const upstream = ctx.upstream.map((u) => contexts[u].publishes).filter(Boolean);
  return [...own, ...upstream];
};

const upstreamContractRules = Object.keys(contexts).map((name) => {
  const allowed = contractsAllowedFor(name);
  return {
    name: `R2-contracts-only-from-upstream:${name}`,
    comment: `[R2] ${name} may only depend on the published language of itself and its upstream contexts (${allowed.join(', ') || 'none'}).`,
    severity: 'error',
    from: { path: `^src/modules/${escape(name)}/` },
    to: {
      path: '^src/contracts/',
      ...(allowed.length > 0 ? { pathNot: `^src/contracts/(${allowed.map(escape).join('|')})$` } : {}),
    },
  };
});

module.exports = {
  forbidden: [
    {
      name: 'R1-no-cross-context-import',
      comment: '[R1] A bounded context must not import code from another bounded context; integrate through events.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/([^/]+)/', pathNot: '^src/modules/$1/' },
    },
    ...upstreamContractRules,
    {
      name: 'R3-shared-kernel-is-leaf',
      comment: '[R3] The shared kernel must not depend on contexts, contracts, infrastructure or the composition root.',
      severity: 'error',
      from: { path: '^src/shared-kernel/' },
      to: { path: ['^src/modules/', '^src/contracts/', '^src/infrastructure/', '^src/[^/]+\\.ts$'] },
    },
    {
      name: 'R4-contracts-are-self-contained',
      comment: '[R4] Published language files may depend only on the shared kernel.',
      severity: 'error',
      from: { path: '^src/contracts/' },
      to: { pathNot: '^src/shared-kernel/' },
    },
    {
      name: 'R5-no-bridge-into-context',
      comment: '[R5] Only the composition root may import a bounded context from outside it.',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/modules/', '^src/app\\.module\\.ts$'] },
      to: { path: '^src/modules/' },
    },
    {
      name: 'R6-persistence-only-in-context-infrastructure',
      comment: '[R6] Only the infrastructure layer of a context may touch the persistence technology.',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/modules/[^/]+/infrastructure/', '^src/infrastructure/prisma/', '^src/app\\.module\\.ts$'] },
      to: { path: ['^src/infrastructure/prisma/', '^node_modules/@prisma/client', '^node_modules/\\.prisma/'] },
    },
    {
      name: 'R12-no-circular',
      comment: '[R12] The context map is acyclic; so must be the dependency graph.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['^dist/', '^experiments/', '^coverage/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      mermaid: { minify: false },
    },
  },
};
