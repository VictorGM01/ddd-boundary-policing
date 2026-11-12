import { readFileSync } from 'node:fs';
import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const { contexts } = JSON.parse(readFileSync(new URL('./context-map.json', import.meta.url), 'utf8'));
const prismaModels = [
  ...readFileSync(new URL('./prisma/schema.prisma', import.meta.url), 'utf8').matchAll(/^model\s+(\w+)/gm),
].map((m) => m[1]);

const contextNames = Object.keys(contexts);
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const literalArg = "/^(Literal|TemplateLiteral)$/";

const contractsAllowedFor = (name) => {
  const ctx = contexts[name];
  return [ctx.publishes, ...ctx.upstream.map((u) => contexts[u].publishes)]
    .filter(Boolean)
    .map((file) => file.replace(/\.ts$/, ''));
};

const R8 = { name: '@nestjs/core', importNames: ['ModuleRef'], message: '[R8] Do not resolve providers dynamically; integrate through events.' };

const syntaxGuards = [
  {
    selector: `Decorator > CallExpression[callee.name='Inject'][arguments.0.type=${literalArg}]`,
    message: '[R11] Injection tokens must be classes or symbols, not strings.',
  },
  {
    selector: "CallExpression[callee.name='require'][arguments.0.type!='Literal']",
    message: '[R13] Module paths must be statically analyzable.',
  },
  {
    selector: "ImportExpression[source.type!='Literal']",
    message: '[R13] Module paths must be statically analyzable.',
  },
];

const contextSyntaxRules = (name) => {
  const foreignModels = prismaModels.filter((m) => !m.startsWith(contexts[name].prismaPrefix));
  const delegates = foreignModels.map(lowerFirst).join('|');
  return [
    ...(delegates
      ? [
          {
            selector: `MemberExpression[property.name=/^(${delegates})$/]`,
            message: `[R7] ${name} must not access persistence models owned by another context.`,
          },
          {
            selector: `MemberExpression[computed=true][property.value=/^(${delegates})$/]`,
            message: `[R7] ${name} must not access persistence models owned by another context.`,
          },
        ]
      : []),
    {
      selector: "CallExpression[callee.name='Module'] Property[key.name='exports']",
      message: '[R9] Bounded context modules must not export providers.',
    },
    {
      selector: `CallExpression[callee.name='OnEvent'][arguments.0.type=${literalArg}]`,
      message: '[R10] Event names must come from the published language in src/contracts.',
    },
    {
      selector: `CallExpression[callee.property.name=/^(emit|emitAsync)$/][arguments.0.type=${literalArg}]`,
      message: '[R10] Event names must come from the published language in src/contracts.',
    },
    ...syntaxGuards,
  ];
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const contextImportRules = (name) => {
  const foreignModels = prismaModels.filter((m) => !m.startsWith(contexts[name].prismaPrefix));
  const allowed = contractsAllowedFor(name).map(escapeRegex).join('|');
  return {
    patterns: [
      {
        regex: allowed ? `(^|/)contracts/(?!(${allowed})$)` : '(^|/)contracts/',
        message: `[R2] ${name} may only depend on the published language of itself and its upstream contexts.`,
      },
    ],
    paths: [
      R8,
      ...(foreignModels.length
        ? [
            {
              name: '@prisma/client',
              importNames: foreignModels,
              message: `[R7] ${name} must not use persistence models owned by another context.`,
            },
          ]
        : []),
    ],
  };
};

const CONTEXT_TYPES = ['context', 'context-infrastructure'];
const NEUTRAL_TYPES = ['shared-kernel', 'contracts', 'persistence', 'technical-infrastructure', 'other'];

const boundaryPolicies = [
  {
    from: { element: { types: NEUTRAL_TYPES } },
    disallow: { to: { element: { types: CONTEXT_TYPES } } },
    message: '[R5] Only the composition root may import a bounded context from outside it.',
  },
  ...contextNames.map((name) => ({
    from: { element: { types: CONTEXT_TYPES, captured: { context: name } } },
    disallow: {
      to: { element: { types: CONTEXT_TYPES, captured: { context: contextNames.filter((n) => n !== name) } } },
    },
    message: '[R1] A bounded context must not import code from another bounded context; integrate through events.',
  })),
  {
    from: { element: { type: 'shared-kernel' } },
    disallow: { to: { element: { types: [...CONTEXT_TYPES, 'contracts', 'persistence', 'technical-infrastructure', 'other'] } } },
    message: '[R3] The shared kernel must not depend on contexts, contracts, infrastructure or the composition root.',
  },
  {
    from: { element: { type: 'contracts' } },
    disallow: { to: { element: { types: [...CONTEXT_TYPES, 'contracts', 'persistence', 'technical-infrastructure', 'other'] } } },
    message: '[R4] Published language files may depend only on the shared kernel.',
  },
  {
    from: { element: { types: ['context', 'shared-kernel', 'contracts', 'technical-infrastructure', 'other'] } },
    disallow: { to: { element: { type: 'persistence' } } },
    message: '[R6] Only the infrastructure layer of a context may touch the persistence technology.',
  },
];

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'experiments/seeded/cases/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/include': ['src/**/*.ts'],
      'boundaries/elements': [
        { type: 'context-infrastructure', pattern: 'src/modules/*/infrastructure', partialMatch: false, capture: ['context'] },
        { type: 'context', pattern: 'src/modules/*', partialMatch: false, capture: ['context'] },
        { type: 'contracts', pattern: 'src/contracts', partialMatch: false },
        { type: 'shared-kernel', pattern: 'src/shared-kernel', partialMatch: false },
        { type: 'persistence', pattern: 'src/infrastructure/prisma', partialMatch: false },
        { type: 'technical-infrastructure', pattern: 'src/infrastructure', partialMatch: false },
        { type: 'other', pattern: 'src/*', partialMatch: false },
      ],
    },
    rules: {
      'boundaries/dependencies': ['error', { default: 'allow', policies: boundaryPolicies }],
      'no-restricted-imports': ['error', { paths: [R8] }],
      'no-restricted-syntax': ['error', ...syntaxGuards],
    },
  },
  {
    files: ['src/contracts/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [R8],
          patterns: [{ regex: '^\\./|^\\.\\./(?!shared-kernel(/|$))|^@/(?!shared-kernel(/|$))', message: '[R4] Published language files may depend only on the shared kernel.' }],
        },
      ],
    },
  },
  ...contextNames.map((name) => ({
    files: [`src/modules/${name}/**/*.ts`],
    rules: {
      'no-restricted-imports': ['error', contextImportRules(name)],
      'no-restricted-syntax': ['error', ...contextSyntaxRules(name)],
    },
  })),
);
