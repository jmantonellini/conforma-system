export const ACCIONES = [
	{ valor: 'view', etiqueta: 'Ver' },
	{ valor: 'create', etiqueta: 'Crear' },
	{ valor: 'edit', etiqueta: 'Editar' },
	{ valor: 'delete', etiqueta: 'Eliminar' }
] as const;

export type Accion = (typeof ACCIONES)[number]['valor'];

type EntradaCatalogo = {
	modulo: string;
	etiqueta: string;
	descripcion: string;
	acciones: readonly Accion[];
};

const COMPLETO = ['view', 'create', 'edit', 'delete'] as const;

export const CATALOGO_PERMISOS: readonly EntradaCatalogo[] = [
	{
		modulo: 'cotizaciones',
		etiqueta: 'Cotizaciones',
		descripcion: 'Consultas, cotizar, asignar y enviar',
		acciones: COMPLETO
	},
	{
		modulo: 'pedidos',
		etiqueta: 'Pedidos',
		descripcion: 'Incluye generar pedidos desde cotizaciones',
		acciones: COMPLETO
	},
	{
		modulo: 'fabricacion',
		etiqueta: 'Fabricación',
		descripcion: 'Órdenes y unidades en producción',
		acciones: COMPLETO
	},
	{ modulo: 'envios', etiqueta: 'Envíos', descripcion: 'Despachos y entregas', acciones: COMPLETO },
	{
		modulo: 'contactos',
		etiqueta: 'Contactos',
		descripcion: 'Clientes, distribuidores y proveedores',
		acciones: COMPLETO
	},
	{
		modulo: 'productos',
		etiqueta: 'Productos',
		descripcion: 'Catálogo, recetas y planos',
		acciones: COMPLETO
	},
	{
		modulo: 'insumos',
		etiqueta: 'Insumos',
		descripcion: 'Catálogo, importación y movimientos',
		acciones: COMPLETO
	},
	{
		modulo: 'stock',
		etiqueta: 'Stock',
		descripcion: 'Existencias y movimientos de productos',
		acciones: ['view', 'edit']
	},
	{
		modulo: 'importes',
		etiqueta: 'Importes',
		descripcion: 'Precios, costos, márgenes y cobros',
		acciones: ['view']
	},
	{
		modulo: 'reportes',
		etiqueta: 'Reportes',
		descripcion: 'Ventas, cotizaciones, producción e insumos',
		acciones: ['view']
	},
	{
		modulo: 'configuracion',
		etiqueta: 'Configuración',
		descripcion: 'Empresa, usuarios, empleados, roles y catálogos',
		acciones: ['view', 'edit']
	}
];

export const PERMISOS_ESTANDAR = CATALOGO_PERMISOS.flatMap(({ modulo, acciones }) =>
	acciones.map((accion) => ({ modulo, accion }))
);

export const ROL_ADMINISTRADOR = 'admin';
