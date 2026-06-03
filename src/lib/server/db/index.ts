// src/lib/server/db/index.ts
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(db?: D1Database) {
	if (db) {
		return drizzleD1(db, { schema });
	}

	console.error('❌ No database binding found');
	throw new Error('No database binding found');
}

export type DrizzleClient = ReturnType<typeof getDb>;
