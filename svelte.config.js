import adapter from '@sveltejs/adapter-node';

const config = {
	compilerOptions: {
		experimental: {
			async: true
		},
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter(),
		experimental: {
			remoteFunctions: true
		}
	},
	preprocess: {
		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, './drizzle.config.ts']
			})
		}
	}
};

export default config;
