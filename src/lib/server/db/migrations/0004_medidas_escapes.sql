INSERT INTO "atributos_categoria" ("empresa_id", "categoria_id", "clave", "etiqueta", "grupo", "tipo", "unidad", "orden")
SELECT c."empresa_id", c."id", d."clave", d."etiqueta", d."grupo", 'numero', 'mm', d."orden"
FROM "categorias_productos" c
CROSS JOIN (VALUES
	('primario_diametro', 'Diámetro', 'Primario', 1),
	('primario_largo', 'Largo', 'Primario', 2),
	('secundario_diametro', 'Diámetro', 'Secundario', 3),
	('secundario_largo', 'Largo', 'Secundario', 4),
	('trombon_diametro_inicial', 'Diámetro inicial', 'Trombón', 5),
	('trombon_diametro_final', 'Diámetro final', 'Trombón', 6),
	('trombon_largo', 'Largo', 'Trombón', 7)
) AS d("clave", "etiqueta", "grupo", "orden")
WHERE c."slug" = 'escapes'
	AND NOT EXISTS (SELECT 1 FROM "atributos_categoria" a WHERE a."categoria_id" = c."id")
ON CONFLICT DO NOTHING;
