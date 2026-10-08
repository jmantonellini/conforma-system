import { defineConfig } from '@playwright/test';
import 'dotenv/config';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabase = testDatabaseUrl ? new URL(testDatabaseUrl) : undefined;
const databaseName = decodeURIComponent(testDatabase?.pathname.slice(1) ?? '');

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: '**/*.e2e.ts',
	use: { baseURL: 'http://127.0.0.1:4173' },
	globalSetup: './tests/e2e/global-setup.ts',
	webServer: {
		command: 'pnpm dev --host 127.0.0.1 --port 4173',
		url: 'http://127.0.0.1:4173/login',
		reuseExistingServer: false,
		timeout: 120_000,
		env: testDatabase
			? {
					DATABASE_URL: testDatabaseUrl,
					DB_HOST: testDatabase.hostname,
					DB_PORT: testDatabase.port || '5432',
					DB_USER: decodeURIComponent(testDatabase.username),
					DB_PASSWORD: decodeURIComponent(testDatabase.password),
					DB_NAME: databaseName
				}
			: undefined
	}
});
