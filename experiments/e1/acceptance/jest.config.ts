import type { Config } from 'jest';

// Used only inside a run copy, where the harness places this folder at <copy>/e1-acceptance.
const config: Config = {
  rootDir: '..',
  roots: ['<rootDir>/e1-acceptance'],
  testRegex: 'T\\d\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { diagnostics: false }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/e1-acceptance/global-setup.ts',
  testTimeout: 30_000,
};

export default config;
