// See https://svelte.dev/docs/kit/types#app.d.ts

import type { DrizzleClient } from '$lib/server/db';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: DrizzleClient;
			user?: {
				id: number;
				username: string;
				rol: string;
			};
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Env;
			cf: CfProperties;
			ctx: ExecutionContext;
		}
	}
}

export {};
