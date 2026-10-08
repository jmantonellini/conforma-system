SELECT setval(
	pg_get_serial_sequence('public.feedback', 'id'),
	COALESCE(MAX(id), 1),
	MAX(id) IS NOT NULL
)
FROM public.feedback;
-- Custom SQL migration file, put your code below! --