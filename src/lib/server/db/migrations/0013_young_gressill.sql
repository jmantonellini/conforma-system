CREATE TABLE "configuracion_empresa" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"razon_social" text DEFAULT 'Conforma' NOT NULL,
	"cuit" text,
	"direccion" text,
	"telefono" text,
	"email" text,
	"logo_url" text,
	"updated_at" timestamp
);
