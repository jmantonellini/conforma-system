INSERT INTO "atributos_categoria" ("empresa_id", "categoria_id", "clave", "etiqueta", "grupo", "tipo", "unidad", "orden")
SELECT c."empresa_id", c."id", d."clave", d."etiqueta", d."grupo", d."tipo", d."unidad", d."orden"
FROM "categorias_productos" c
CROSS JOIN (VALUES
	('primario_diametro_final', 'Diámetro final', 'Primario', 'numero', 'mm', 2),
	('primario_largo_escalon', 'Largo del escalón', 'Primario', 'numero', 'mm', 3),
	('colector_configuracion', 'Configuración', 'Colector', 'texto', NULL, 7),
	('colector_diametro_salida', 'Diámetro de salida', 'Colector', 'numero', 'mm', 8),
	('colector_sondas_lambda', 'Sondas lambda', 'Colector', 'numero', NULL, 9),
	('material', 'Material', 'Construcción', 'texto', NULL, 13),
	('espesor_pared', 'Espesor de pared', 'Construcción', 'numero', 'mm', 14),
	('espesor_brida', 'Espesor de brida', 'Construcción', 'numero', 'mm', 15),
	('terminacion', 'Terminación', 'Construcción', 'texto', NULL, 16)
) AS d("clave", "etiqueta", "grupo", "tipo", "unidad", "orden")
WHERE c."slug" = 'escapes'
	AND EXISTS (SELECT 1 FROM "atributos_categoria" a WHERE a."categoria_id" = c."id" AND a."clave" = 'primario_diametro')
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "atributos_categoria" a
SET "orden" = d."orden"
FROM "categorias_productos" c, (VALUES
	('primario_diametro', 1),
	('primario_largo', 4),
	('secundario_diametro', 5),
	('secundario_largo', 6),
	('trombon_diametro_inicial', 10),
	('trombon_diametro_final', 11),
	('trombon_largo', 12)
) AS d("clave", "orden")
WHERE c."id" = a."categoria_id" AND c."slug" = 'escapes' AND a."clave" = d."clave";
