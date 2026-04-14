/**
 * Configuración de Rutas - routes.jsx
 * 
 * Este archivo centraliza todas las rutas de la aplicación (como urls.py en Django)
 * Facilita el mantenimiento y visualización de la estructura
 */

import Login from '../pages/Login';
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

/**
 * Estructura de rutas
 * {
 *   path: string - Ruta de acceso
 *   element: React Component - Componente a renderizar
 *   private: boolean - Si requiere autenticación
 *   layout: boolean - Si usa el layout estándar
 *   title: string - Título de la página
 * }
 */
export const routes = [
    {
        path: '/login',
        element: Login,
        private: false,
        layout: false,
        title: 'Iniciar Sesión'
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
        title: 'Órdenes de Trabajo'
    },
    // Agregar más rutas aquí
    // {
    //     path: '/perfil',
    //     element: ProfilePage,
    //     private: true,
    //     layout: true,
    //     title: 'Mi Perfil'
    // },
];

export default routes;
