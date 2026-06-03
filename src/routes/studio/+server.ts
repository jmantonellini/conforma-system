import { basicAuth, createStudioApp } from 'wrangler-studio';

export const GET = async ({ platform }) => {
  if (!platform?.env.DB) {
    return new Response('Database not configured', { status: 500 });
  }
	const app = createStudioApp({
		db: platform.env.DB,
		auth: basicAuth('admin', '12345') // protege el acceso
	});
	return app.fetch(new Request('https://fake-host'), { DB: platform.env.DB });
};
