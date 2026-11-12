export function withCache(seconds: number): ResponseInit {
	return {
		headers: {
			'Cache-Control': `max-age=${seconds}`
		}
	};
}
