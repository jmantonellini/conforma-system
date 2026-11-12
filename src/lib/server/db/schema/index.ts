import type { adjuntos } from './adjuntos';
import type { empleados, permisos, roles, usuarios } from './acceso';
import type { cotizaciones, lineas_cotizacion, notas_cotizacion } from './cotizaciones';
import type { estados, logs_cambios_estado, transiciones_estado } from './estados';
import type {
	materiales_empleados,
	ordenes_fabricacion,
	tipos_material,
	unidades_fabricacion
} from './fabricacion';
import type { insumos } from './insumos';
import type { lineas_pedido, pedido_insumos, pedidos } from './pedidos';
import type { atributos_categoria, producto_insumos, productos } from './productos';
import type { logs_sistema, notificaciones, tareas } from './sistema';

export * from './base';
export * from './acceso';
export * from './estados';
export * from './contactos';
export * from './productos';
export * from './insumos';
export * from './cotizaciones';
export * from './pedidos';
export * from './fabricacion';
export * from './stock';
export * from './adjuntos';
export * from './sistema';

export type Usuario = typeof usuarios.$inferSelect;
export type Rol = typeof roles.$inferSelect;
export type Permiso = typeof permisos.$inferSelect;
export type Empleado = typeof empleados.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
export type LineaPedido = typeof lineas_pedido.$inferSelect;
export type Producto = typeof productos.$inferSelect;
export type AtributoCategoria = typeof atributos_categoria.$inferSelect;
export type OrdenFabricacion = typeof ordenes_fabricacion.$inferSelect;
export type UnidadFabricacion = typeof unidades_fabricacion.$inferSelect;
export type Estado = typeof estados.$inferSelect;
export type Cotizacion = typeof cotizaciones.$inferSelect;
export type LineaCotizacion = typeof lineas_cotizacion.$inferSelect;
export type Adjunto = typeof adjuntos.$inferSelect;
export type NotaCotizacion = typeof notas_cotizacion.$inferSelect;
export type Notificacion = typeof notificaciones.$inferSelect;
export type TransicionEstado = typeof transiciones_estado.$inferSelect;
export type LogCambioEstado = typeof logs_cambios_estado.$inferSelect;
export type LogSistema = typeof logs_sistema.$inferSelect;
export type Tarea = typeof tareas.$inferSelect;
export type TipoMaterial = typeof tipos_material.$inferSelect;
export type MaterialEmpleado = typeof materiales_empleados.$inferSelect;
export type Insumos = typeof insumos.$inferSelect;
export type ProductoInsumo = typeof producto_insumos.$inferSelect;
export type PedidoInsumo = typeof pedido_insumos.$inferSelect;
