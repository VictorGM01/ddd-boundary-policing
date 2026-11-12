import { execSync } from 'node:child_process';

export const E2E_DATABASE_URL = 'file:./e2e.db';

export default function globalSetup(): void {
  process.env.DATABASE_URL = E2E_DATABASE_URL;
  execSync('npx prisma db push --force-reset --skip-generate', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });
}
