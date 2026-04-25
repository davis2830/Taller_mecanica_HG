/**
 * Configuración de Rutas - routes.jsx
 * 
 * Este archivo centraliza todas las rutas de la aplicación (como urls.py en Django)
 * Facilita el mantenimiento y visualización de la estructura
 */

import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import CitasCalendar from '../pages/CitasCalendar';
import KanbanBoard from '../pages/KanbanBoard';

import MisCitasList from '../pages/Citas/MisCitasList';
import VehiculosList from '../pages/Citas/VehiculosList';
import ClientesList from '../pages/Citas/ClientesList';
import ServiciosList from '../pages/Citas/ServiciosList';
import NuevaRecepcionPage from '../pages/Citas/NuevaRecepcionPage';
import BoletaRecepcionPage from '../pages/Citas/BoletaRecepcionPage';
import ReporteUtilidades from '../pages/Reportes/ReporteUtilidades';
import HistorialOrdenesPage from '../pages/Taller/HistorialOrdenesPage';
import FacturasPage from '../pages/Facturacion/FacturasPage';
import ProductosPage from '../pages/Inventario/ProductosPage';
import CategoriasPage from '../pages/Inventario/CategoriasPage';
import MovimientosPage from '../pages/Inventario/MovimientosPage';
import DashboardComprasPage from '../pages/Inventario/DashboardComprasPage';
import SistemaUsuariosPage from '../pages/Sistema/SistemaUsuariosPage';
import SistemaRolesPage from '../pages/Sistema/SistemaRolesPage';
import ConfiguracionTallerPage from '../pages/Sistema/ConfiguracionTallerPage';

export const routes = [
    {
        path: '/login',
        element: Login,
        private: false,
        layout: false,
        title: 'Iniciar Sesión'
    },
    {
        path: '/register',
        element: Register,
        private: false,
        layout: false,
        title: 'Crear Cuenta'
    },
    {
        path: '/',
        element: Dashboard,
        private: true,
        layout: true,
        title: 'Dashboard'
    },
    {
        path: '/citas',
        element: MisCitasList,
        private: true,
        layout: true,
        title: 'Mis Citas'
    },
    {
        path: '/citas/vehiculos',
        element: VehiculosList,
        private: true,
        layout: true,
        title: 'Directorio de Vehículos'
    },
    {
        path: '/citas/recepcion/nueva',
        element: NuevaRecepcionPage,
        private: true,
        layout: true,
        title: 'Nueva Recepción'
    },
    {
        path: '/citas/recepcion/:pk/boleta',
        element: BoletaRecepcionPage,
        private: true,
        layout: false,
        title: 'Boleta de Recepción'
    },
    {
        path: '/citas/clientes',
        element: ClientesList,
        private: true,
        layout: true,
        title: 'Base de Clientes'
    },
    {
        path: '/citas/calendario',
        element: CitasCalendar,
        private: true,
        layout: true,
        title: 'Calendario Recepción'
    },
    {
        path: '/citas/servicios',
        element: ServiciosList,
        private: true,
        layout: true,
        title: 'Catálogo de Servicios'
    },
    {
        path: '/reportes/utilidades',
        element: ReporteUtilidades,
        private: true,
        layout: true,
        title: 'Reporte de Utilidades'
    },
    {
        path: '/kanban',
        element: KanbanBoard,
        private: true,
        layout: true,
        // fullHeight evita que layout-main tenga overflow-y: auto, que @hello-pangea/dnd
        // usaba como contenedor de auto-scroll vertical al arrastrar — provocaba que la
        // tarjeta "se fuera al fondo" porque scrolleaba la página en vez del tablero.
        fullHeight: true,
        title: 'Órdenes de Trabajo'
    },
    {
        path: '/taller/historial',
        element: HistorialOrdenesPage,
        private: true,
        layout: true,
        title: 'Historial de Órdenes'
    },
    {
        path: '/facturacion',
        element: FacturasPage,
        private: true,
        layout: true,
        title: 'Facturación'
    },
    {
        path: '/inventario/productos',
        element: ProductosPage,
        private: true,
        layout: true,
        title: 'Catálogo de Inventario'
    },
    {
        path: '/inventario/categorias',
        element: CategoriasPage,
        private: true,
        layout: true,
        title: 'Categorías de Inventario'
    },
    {
        path: '/inventario/movimientos',
        element: MovimientosPage,
        private: true,
        layout: true,
        title: 'Movimientos de Inventario'
    },
    {
        path: '/inventario/compras',
        element: DashboardComprasPage,
        private: true,
        layout: true,
        title: 'Compras y Proveedores'
    },
    {
        path: '/sistema/usuarios',
        element: SistemaUsuariosPage,
        private: true,
        layout: true,
        title: 'Gestión de Usuarios'
    },
    {
        path: '/sistema/roles',
        element: SistemaRolesPage,
        private: true,
        layout: true,
        title: 'Gestión de Roles'
    },
    {
        path: '/sistema/configuracion',
        element: ConfiguracionTallerPage,
        private: true,
        layout: true,
        title: 'Configuración del Taller'
    },
];

export default routes;
