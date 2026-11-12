import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

export const E2E_DATABASE_URL = 'file:./e2e.db';

export default function globalSetup(): void {
  process.env.DATABASE_URL = E2E_DATABASE_URL;
  for (const suffix of ['', '-journal']) {
    rmSync(join(__dirname, '..', 'prisma', `e2e.db${suffix}`), { force: true });
  }
  execSync('npx prisma db push --skip-generate', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });
}
