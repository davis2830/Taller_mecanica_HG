import React, { useContext, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, ChevronDown, Bell, Search } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Mapa de rutas a títulos legibles
const PAGE_TITLES = {
    '/':                        { title: 'Dashboard',               sub: 'Bienvenido a AutoServi Pro' },
    '/citas':                   { title: 'Mis Citas',               sub: 'Gestión de citas y agendas' },
    '/citas/vehiculos':         { title: 'Directorio & Clínica',    sub: 'Vehículos registrados' },
    '/citas/recepcion/nueva':   { title: 'Nueva Recepción',         sub: 'Registro de ingreso de vehículo' },
    '/citas/clientes':          { title: 'Base de Clientes',        sub: 'Directorio de clientes' },
    '/citas/calendario':        { title: 'Calendario',              sub: 'Vista de agenda' },
    '/citas/servicios':         { title: 'Catálogo de Servicios',   sub: 'Servicios disponibles' },
    '/kanban':                  { title: 'Órdenes de Trabajo',      sub: 'Tablero Kanban del taller' },
    '/taller/historial':        { title: 'Historial de Órdenes',    sub: 'Registro histórico del taller' },
    '/facturacion':             { title: 'Facturación',             sub: 'Facturas emitidas' },
    '/inventario/productos':    { title: 'Inventario',              sub: 'Catálogo de productos' },
    '/inventario/categorias':   { title: 'Categorías',              sub: 'Organización del inventario' },
    '/inventario/movimientos':  { title: 'Movimientos',             sub: 'Entradas y salidas' },
    '/inventario/compras':      { title: 'Compras & Proveedores',   sub: 'Gestión de compras' },
    '/reportes/utilidades':     { title: 'Reporte de Utilidades',   sub: 'Análisis financiero' },
    '/sistema/usuarios':        { title: 'Usuarios',                sub: 'Gestión del sistema' },
    '/sistema/roles':           { title: 'Roles',                   sub: 'Permisos del sistema' },
};

export default function AppHeader() {
    const { user, logoutUser } = useContext(AuthContext);
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const pageInfo = PAGE_TITLES[location.pathname] || { title: 'AutoServi Pro', sub: '' };
    const rolNombre = user?.perfil?.rol?.nombre || (user?.is_superuser ? 'Superusuario' : '—');
    const initials = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')) || user?.username?.[0]?.toUpperCase() || 'U';
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Usuario';

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        setMenuOpen(false);
        logoutUser();
        navigate('/login');
    };

    // Colores del rol
    const rolColor = {
        'Administrador': 'from-purple-500 to-purple-700',
        'Recepcionista':  'from-blue-500 to-blue-700',
        'Mecánico':       'from-orange-500 to-orange-700',
        'Cliente':        'from-emerald-500 to-emerald-700',
        'Superusuario':   'from-rose-500 to-rose-700',
    }[rolNombre] || 'from-slate-500 to-slate-700';

    if (!user) return null;

    return (
        <header className={`sticky top-0 z-40 flex-shrink-0 flex items-center justify-between h-[62px] px-6 border-b transition-colors ${
            isDark
                ? 'bg-slate-900/95 backdrop-blur-md border-slate-800'
                : 'bg-white/95 backdrop-blur-md border-slate-200'
        } shadow-sm`}>

            {/* LEFT — Breadcrumb dinámico */}
            <div className="flex flex-col justify-center min-w-0">
                <h1 className={`text-base font-black leading-tight tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {pageInfo.title}
                </h1>
                {pageInfo.sub && (
                    <p className={`text-[11px] font-medium leading-tight truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {pageInfo.sub}
                    </p>
                )}
            </div>

            {/* RIGHT — Acciones */}
            <div className="flex items-center gap-2 shrink-0">

                {/* Toggle Tema */}
                <button
                    onClick={toggleTheme}
                    title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-yellow-300 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    {isDark
                        ? <Sun size={18} className="transition-transform hover:rotate-45 duration-300" />
                        : <Moon size={18} />
                    }
                </button>

                {/* Separador */}
                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                {/* Avatar + Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(prev => !prev)}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all ${
                            isDark
                                ? 'border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                                : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        } ${menuOpen ? (isDark ? 'bg-slate-800' : 'bg-slate-50') : ''}`}
                    >
                        {/* Avatar */}
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${rolColor} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm`}>
                            {initials}
                        </div>
                        {/* Nombre + rol */}
                        <div className="hidden sm:flex flex-col items-start leading-tight pr-0.5">
                            <span className={`text-xs font-bold truncate max-w-[120px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{fullName}</span>
                            <span className={`text-[10px] truncate max-w-[120px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{rolNombre}</span>
                        </div>
                        <ChevronDown size={13} className={`transition-transform duration-200 ${isDark ? 'text-slate-500' : 'text-slate-400'} ${menuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    {menuOpen && (
                        <div className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl shadow-black/20 overflow-hidden z-50 ${
                            isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                            style={{ animation: 'dropIn 0.15s ease-out forwards' }}
                        >
                            {/* User card */}
                            <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${rolColor} flex items-center justify-center text-white font-black text-sm shadow`}>
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{fullName}</p>
                                        <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email || rolNombre}</p>
                                    </div>
                                </div>
                                {/* Badge del rol */}
                                <div className="mt-2.5">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r ${rolColor} text-white`}>
                                        {rolNombre}
                                    </span>
                                </div>
                            </div>

                            {/* Logout */}
                            <div className="p-1.5">
                                <button
                                    onClick={handleLogout}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors text-rose-500 hover:bg-rose-500/10`}
                                >
                                    <LogOut size={15} />
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes dropIn {
                    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </header>
    );
}
