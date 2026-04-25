import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    BarChart3, Calendar, Clipboard, Settings, ChevronDown, ChevronRight,
    List, Car, Users, Wrench, Truck, TrendingUp, Hammer, Receipt,
    Package, Archive, ArrowRightLeft, LayoutList, ShoppingCart, Shield, LogOut,
    SlidersHorizontal, FileText, Building2, DollarSign, Clock
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import '../styles/app-sidebar.css';

/* ──── Mapa de ruta → sección padre ──────────────────── */
const ROUTE_SECTION_MAP = {
    '/citas':                   'Citas',
    '/citas/vehiculos':         'Citas',
    '/citas/recepcion/nueva':   'Citas',
    '/citas/clientes':          'Citas',
    '/citas/calendario':        'Citas',
    '/kanban':                  'Taller',
    '/citas/servicios':         'Taller',
    '/taller/historial':        'Taller',
    '/inventario/productos':    'Inventario',
    '/inventario/categorias':   'Inventario',
    '/inventario/movimientos':  'Inventario',
    '/inventario/compras':      'Inventario',
    '/facturacion':             'Facturación',
    '/finanzas/empresas':       'Facturación',
    '/finanzas/cuentas-por-cobrar': 'Facturación',
    '/reportes/utilidades':     'Reportes',
    '/sistema/usuarios':        'Sistema',
    '/sistema/roles':           'Sistema',
    '/sistema/configuracion':   'Sistema',
    '/sistema/configuracion-fiscal': 'Sistema',
    '/sistema/tareas-programadas': 'Sistema',
};

const STORAGE_KEY = 'sidebar_expanded';

function getInitialExpanded(pathname) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    const section = ROUTE_SECTION_MAP[pathname];
    return section ? { [section]: true } : {};
}

/* ──── Sub-componente SubItem ─────────────────────────── */
function SubItem({ item, isActive, onClick }) {
    return (
        <li>
            <button
                onClick={onClick}
                className={`w-full text-left flex items-center gap-2.5 py-1.5 px-3 rounded-lg text-[12.5px] font-medium transition-colors ${
                    isActive
                        ? 'text-[var(--sb-accent-text)] bg-[var(--sb-accent-soft)]'
                        : 'text-[var(--sb-muted)] hover:text-[var(--sb-text)] hover:bg-[var(--sb-bg-hover)]'
                }`}
            >
                <span className="opacity-70 flex-shrink-0">{item.icon}</span>
                {item.label}
            </button>
        </li>
    );
}

/* ──── Sub-componente NavSection ──────────────────────── */
function NavSection({ items, collapsed, expandedMenu, toggleSubMenu, navigate, currentPath }) {
    return (
        <ul className="nav-list">
            {items.map((item) => {
                const hasChildren = Boolean(item.subItems);
                const isExpanded  = Boolean(expandedMenu[item.label]);
                const isActive    = !hasChildren && currentPath === item.path;

                return (
                    <li key={item.label}>
                        <button
                            onClick={() => {
                                if (hasChildren) {
                                    toggleSubMenu(item.label);
                                } else {
                                    navigate(item.path);
                                }
                            }}
                            className={`nav-item ${isActive ? 'active' : ''} flex justify-between items-center`}
                            title={collapsed ? item.label : ''}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="nav-icon flex-shrink-0">{item.icon}</span>
                                {!collapsed && <span className="nav-label">{item.label}</span>}
                            </div>
                            {!collapsed && hasChildren && (
                                <span className="flex-shrink-0 opacity-40">
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </span>
                            )}
                        </button>

                        {/* Sub-items */}
                        {!collapsed && hasChildren && isExpanded && (
                            <ul className="mt-0.5 mb-1 ml-8 space-y-0.5 border-l border-[var(--sb-divider)] pl-3">
                                {item.subItems.map(sub => (
                                    <SubItem
                                        key={sub.path}
                                        item={sub}
                                        isActive={currentPath === sub.path}
                                        onClick={() => navigate(sub.path)}
                                    />
                                ))}
                            </ul>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

/* ──── Sidebar Principal ──────────────────────────────── */
export default function AppSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logoutUser } = useContext(AuthContext);
    const [collapsed, setCollapsed]     = useState(false);
    const [expandedMenu, setExpandedMenu] = useState(() => getInitialExpanded(location.pathname));

    const isStaff   = user?.is_staff || user?.is_superuser;
    const rolNombre = user?.perfil?.rol?.nombre || '';
    const isCliente = rolNombre === 'Cliente';
    const initials  = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')) || user?.username?.[0]?.toUpperCase() || 'U';
    const fullName  = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Usuario';

    // Auto-expand on route change
    useEffect(() => {
        const section = ROUTE_SECTION_MAP[location.pathname];
        if (section) {
            setExpandedMenu(prev => {
                const next = { ...prev, [section]: true };
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
                return next;
            });
        }
    }, [location.pathname]);

    const toggleSubMenu = useCallback((label) => {
        setExpandedMenu(prev => {
            const next = { ...prev, [label]: !prev[label] };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    // Ocultar en páginas públicas
    if (location.pathname === '/login' || location.pathname === '/register') return null;

    // ── Rol colors ─────────────────────────────────────
    const ROL_GRADIENT = {
        'Administrador': 'from-purple-500 to-purple-700',
        'Recepcionista':  'from-blue-500 to-blue-700',
        'Mecánico':       'from-orange-500 to-orange-700',
        'Cliente':        'from-emerald-500 to-emerald-700',
    }[rolNombre] || 'from-slate-500 to-slate-700';

    // ── Footer del usuario ──────────────────────────────
    const UserFooter = () => (
        <div className={`flex-shrink-0 border-t border-[var(--sb-divider)] p-3`}>
            {collapsed ? (
                <div className={`w-9 h-9 mx-auto rounded-xl bg-gradient-to-br ${ROL_GRADIENT} flex items-center justify-center text-white font-black text-sm`}>
                    {initials}
                </div>
            ) : (
                <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ROL_GRADIENT} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold truncate text-[var(--sb-text)]">{fullName}</p>
                        <p className="text-[11px] truncate text-[var(--sb-muted)]">{rolNombre || 'Usuario'}</p>
                    </div>
                    <button
                        onClick={() => { logoutUser(); navigate('/login'); }}
                        title="Cerrar Sesión"
                        className="p-1.5 rounded-lg text-[var(--sb-muted)] hover:text-rose-400 hover:bg-rose-400/10 transition-colors flex-shrink-0"
                    >
                        <LogOut size={15} />
                    </button>
                </div>
            )}
        </div>
    );

    // ── Header compartido ───────────────────────────────
    const SidebarHeader = () => (
        <div className="sidebar-header">
            <div className="sidebar-logo">
                <Settings size={22} className="logo-icon" />
                {!collapsed && <span className="logo-text">AutoServi</span>}
            </div>
            <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir' : 'Colapsar'}>
                {collapsed ? '→' : '←'}
            </button>
        </div>
    );

    const navProps = { collapsed, expandedMenu, toggleSubMenu, navigate, currentPath: location.pathname };

    // ── MENÚ CLIENTE ────────────────────────────────────
    if (isCliente) {
        return (
            <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
                <SidebarHeader />
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        {!collapsed && <p className="nav-title">Mi Portal</p>}
                        <NavSection items={[
                            {
                                icon: <Calendar size={18} />,
                                label: 'Citas',
                                path: '#citas',
                                subItems: [
                                    { icon: <List size={15} />, label: 'Mis Citas',            path: '/citas' },
                                    { icon: <Car  size={15} />, label: 'Directorio y Clínica', path: '/citas/vehiculos' },
                                ]
                            },
                        ]} {...navProps} />
                    </div>
                </nav>
                <UserFooter />
            </aside>
        );
    }

    // ── MENÚ STAFF / ADMIN ──────────────────────────────
    const menuSections = [
        {
            title: 'General',
            items: [
                { icon: <BarChart3 size={18} />, label: 'Dashboard', path: '/' },
            ]
        },
        {
            title: 'Operaciones',
            items: [
                {
                    icon: <Calendar size={18} />, label: 'Citas', path: '#citas',
                    subItems: [
                        { icon: <List size={15} />,     label: 'Mis Citas',           path: '/citas' },
                        { icon: <Car  size={15} />,     label: 'Directorio y Clínica', path: '/citas/vehiculos' },
                        { icon: <Truck size={15} />,    label: 'Nueva Recepción',     path: '/citas/recepcion/nueva' },
                        { icon: <Users size={15} />,    label: 'Base de Clientes',    path: '/citas/clientes' },
                        { icon: <Calendar size={15} />, label: 'Calendario',          path: '/citas/calendario' },
                    ]
                },
                {
                    icon: <Hammer size={18} />, label: 'Taller', path: '#taller',
                    subItems: [
                        { icon: <Clipboard size={15} />, label: 'Órdenes de Trabajo',    path: '/kanban' },
                        { icon: <Wrench size={15} />,    label: 'Catálogo de Servicios', path: '/citas/servicios' },
                        { icon: <List size={15} />,      label: 'Historial de Órdenes',  path: '/taller/historial' },
                    ]
                },
            ]
        },
        ...(isStaff ? [{
            title: 'Finanzas',
            items: [
                {
                    icon: <Receipt size={18} />, label: 'Facturación', path: '#facturacion',
                    subItems: [
                        { icon: <Receipt size={15} />,    label: 'Lista de Facturas',   path: '/facturacion' },
                        { icon: <Building2 size={15} />,  label: 'Empresas (CxC)',      path: '/finanzas/empresas' },
                        { icon: <DollarSign size={15} />, label: 'Cuentas por Cobrar',  path: '/finanzas/cuentas-por-cobrar' },
                    ]
                },
                {
                    icon: <Package size={18} />, label: 'Inventario', path: '#inventario',
                    subItems: [
                        { icon: <Archive size={15} />,        label: 'Productos',             path: '/inventario/productos' },
                        { icon: <LayoutList size={15} />,     label: 'Categorías',            path: '/inventario/categorias' },
                        { icon: <ArrowRightLeft size={15} />, label: 'Movimientos',           path: '/inventario/movimientos' },
                        { icon: <ShoppingCart size={15} />,   label: 'Compras & Proveedores', path: '/inventario/compras' },
                    ]
                },
            ]
        }] : []),
        ...(isStaff ? [{
            title: 'Sistema',
            items: [
                {
                    icon: <TrendingUp size={18} />, label: 'Reportes', path: '#reportes',
                    subItems: [
                        { icon: <BarChart3 size={15} />, label: 'Utilidades', path: '/reportes/utilidades' },
                    ]
                },
                {
                    icon: <Settings size={18} />, label: 'Sistema', path: '#sistema',
                    subItems: [
                        { icon: <Users size={15} />,  label: 'Usuarios', path: '/sistema/usuarios' },
                        { icon: <Shield size={15} />, label: 'Roles',    path: '/sistema/roles' },
                        { icon: <SlidersHorizontal size={15} />, label: 'Configuración del Taller', path: '/sistema/configuracion' },
                        { icon: <FileText size={15} />, label: 'Configuración Fiscal (FEL)', path: '/sistema/configuracion-fiscal' },
                        { icon: <Clock size={15} />, label: 'Tareas Programadas', path: '/sistema/tareas-programadas' },
                    ]
                },
            ]
        }] : []),
    ];

    return (
        <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
            <SidebarHeader />
            <nav className="sidebar-nav">
                {menuSections.map((section, idx) => (
                    <div key={section.title} className="nav-section">
                        {idx > 0 && <div className="nav-divider" />}
                        {!collapsed && <p className="nav-title">{section.title}</p>}
                        <NavSection items={section.items} {...navProps} />
                    </div>
                ))}
            </nav>
            <UserFooter />
        </aside>
    );
}
