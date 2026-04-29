import React, { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutGrid, Building2, Users, LogOut, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Layout principal del panel superadmin SaaS.
 *
 * Layout: sidebar fijo a la izquierda + topbar + contenido.
 * Protegido por guard en router — si llega acá, el user ya está autenticado.
 */
export default function AdminLayout() {
    const { user, logoutUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logoutUser();
        navigate('/login');
    };

    const navItems = [
        { to: '/', label: 'Resumen', icon: LayoutGrid, end: true },
        { to: '/tenants', label: 'Talleres', icon: Building2 },
        { to: '/usuarios', label: 'Usuarios SaaS', icon: Users },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600">
                        <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">SaaS Admin</p>
                        <p className="text-xs text-slate-500">AutoServi Pro</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-1 p-3">
                    {navItems.map((item) => {
                        const NavIcon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                                        isActive
                                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                    }`
                                }
                            >
                                <NavIcon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 p-3">
                    <div className="mb-2 px-2 py-1">
                        <p className="text-xs text-slate-500">Conectado como</p>
                        <p className="truncate text-sm font-medium text-slate-200">
                            {user?.email || '—'}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">{user?.rol || user?.user_type}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-red-950/30 hover:text-red-300"
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="ml-64 min-h-screen p-8">
                <Outlet />
            </main>
        </div>
    );
}
