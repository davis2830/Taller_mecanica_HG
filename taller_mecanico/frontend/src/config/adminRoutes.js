/**
 * Rutas del panel superadmin SaaS.
 *
 * Solo se montan cuando ``isAdminMode === true`` (hostname empieza con
 * ``admin.`` o ``?mode=admin`` en la URL). En modo tenant las rutas normales
 * de ``routes.js`` toman su lugar.
 *
 * Layout: AdminLayout envuelve todas las rutas privadas (sidebar + topbar).
 */
import AdminLogin from '../pages/admin/AdminLogin';
import AdminDashboard from '../pages/admin/AdminDashboard';
import TenantList from '../pages/admin/TenantList';
import PublicUserList from '../pages/admin/PublicUserList';

export const adminRoutes = [
    {
        path: '/login',
        element: AdminLogin,
        private: false,
        title: 'Admin Login',
    },
    {
        path: '/',
        element: AdminDashboard,
        private: true,
        title: 'Resumen SaaS',
    },
    {
        path: '/tenants',
        element: TenantList,
        private: true,
        title: 'Talleres',
    },
    {
        path: '/usuarios',
        element: PublicUserList,
        private: true,
        title: 'Usuarios SaaS',
    },
];

export default adminRoutes;
