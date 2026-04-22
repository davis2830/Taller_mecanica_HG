import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Calendar, Clipboard, Settings, ChevronDown, ChevronRight, List, Car, Users, Wrench, Truck, TrendingUp, Hammer, Receipt, Package, Archive, ArrowRightLeft, LayoutList, ShoppingCart, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import '../styles/app-sidebar.css';

// Route → parent section mapping for auto-expand
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
    '/reportes/utilidades':     'Reportes',
    '/sistema/usuarios':        'Sistema',
    '/sistema/roles':           'Sistema',
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

export default function AppSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const [collapsed, setCollapsed] = useState(false);
    const [expandedMenu, setExpandedMenu] = useState(() => getInitialExpanded(location.pathname));

    // ------------------------------------------------------------------
    // Rol helpers
    // ------------------------------------------------------------------
    const isStaff     = user?.is_staff || user?.is_superuser;
    const rolNombre   = user?.perfil?.rol?.nombre || '';
    const isCliente   = rolNombre === 'Cliente';   // Solo rol Cliente
    const isMecanico  = rolNombre === 'Mecánico';

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

    const toggleSubMenu = (label) => {
        setExpandedMenu(prev => {
            const next = { ...prev, [label]: !prev[label] };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    };

    // No mostrar sidebar en login ni register
    if (location.pathname === '/login' || location.pathname === '/register') return null;

    // ------------------------------------------------------------------
    // Menú CLIENTE — solo Citas (Mis Citas + Directorio/Clínica)
    // ------------------------------------------------------------------
    if (isCliente) {
        const clienteItems = [
            {
                icon: <Calendar size={20} />,
                label: 'Citas',
                path: '#citas',
                subItems: [
                    { icon: <List size={18} />,  label: 'Mis Citas',            path: '/citas' },
                    { icon: <Car  size={18} />,  label: 'Directorio y Clínica', path: '/citas/vehiculos' },
                ]
            },
        ];

        return (
            <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Settings size={24} className="logo-icon" />
                        {!collapsed && <span className="logo-text">AutoServi</span>}
                    </div>
                    <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir' : 'Colapsar'}>
                        {collapsed ? '→' : '←'}
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        {!collapsed && <p className="nav-title">Mi Portal</p>}
                        <ul className="nav-list">
                            {clienteItems.map((item) => (
                                <li key={item.label}>
                                    <button
                                        onClick={() => {
                                            if (item.subItems) {
                                                if (collapsed) setCollapsed(false);
                                                toggleSubMenu(item.label);
                                            } else {
                                                navigate(item.path);
                                            }
                                        }}
                                        className={`nav-item w-full text-left bg-transparent border-none cursor-pointer flex justify-between items-center`}
                                        title={collapsed ? item.label : ''}
                                    >
                                        <div className="flex items-center">
                                            <span className="nav-icon">{item.icon}</span>
                                            {!collapsed && <span className="nav-label">{item.label}</span>}
                                        </div>
                                        {!collapsed && item.subItems && (
                                            <span className="text-slate-400">
                                                {expandedMenu[item.label] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </span>
                                        )}
                                    </button>
                                    {!collapsed && item.subItems && expandedMenu[item.label] && (
                                        <ul className="mt-1 mb-2 ml-9 border-l border-slate-700 pl-2 space-y-1">
                                            {item.subItems.map(sub => (
                                                <li key={sub.path}>
                                                    <button
                                                        onClick={() => navigate(sub.path)}
                                                        className={`w-full text-left flex items-center py-2 px-3 rounded-md text-sm cursor-pointer transition-colors ${
                                                            location.pathname === sub.path
                                                                ? 'bg-blue-600/10 text-blue-400 font-medium'
                                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <span className="mr-3 opacity-70">{sub.icon}</span>
                                                        {sub.label}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>
            </aside>
        );
    }

    // ------------------------------------------------------------------
    // Menú STAFF / ADMIN / MECÁNICO — menú completo
    // ------------------------------------------------------------------
    const menuItems = [
        {
            icon: <BarChart3 size={20} />,
            label: 'Dashboard',
            path: '/',
        },
        {
            icon: <Calendar size={20} />,
            label: 'Citas',
            path: '#citas',
            subItems: [
                { icon: <List size={18} />,     label: 'Mis Citas',           path: '/citas' },
                { icon: <Car size={18} />,      label: 'Directorio y Clínica', path: '/citas/vehiculos' },
                { icon: <Truck size={18} />,    label: 'Nueva Recepción',     path: '/citas/recepcion/nueva' },
                { icon: <Users size={18} />,    label: 'Base de Clientes',    path: '/citas/clientes' },
                { icon: <Calendar size={18} />, label: 'Calendario',          path: '/citas/calendario' },
            ]
        },
        {
            icon: <Hammer size={20} />,
            label: 'Taller',
            path: '#taller',
            subItems: [
                { icon: <Clipboard size={18} />, label: 'Órdenes de Trabajo',   path: '/kanban' },
                { icon: <Wrench size={18} />,    label: 'Catálogo de Servicios', path: '/citas/servicios' },
                { icon: <List size={18} />,      label: 'Historial de Órdenes',  path: '/taller/historial' },
            ]
        },
        ...(isStaff ? [{
            icon: <Receipt size={20} />,
            label: 'Facturación',
            path: '#facturacion',
            subItems: [
                { icon: <Receipt size={18} />, label: 'Lista de Facturas', path: '/facturacion' },
            ]
        }] : []),
        ...(isStaff ? [{
            icon: <Package size={20} />,
            label: 'Inventario',
            path: '#inventario',
            subItems: [
                { icon: <Archive size={18} />,       label: 'Productos',              path: '/inventario/productos' },
                { icon: <LayoutList size={18} />,    label: 'Categorías',             path: '/inventario/categorias' },
                { icon: <ArrowRightLeft size={18} />,label: 'Movimientos',            path: '/inventario/movimientos' },
                { icon: <ShoppingCart size={18} />,  label: 'Compras y Proveedores',  path: '/inventario/compras' },
            ]
        }] : []),
        ...(isStaff ? [{
            icon: <TrendingUp size={20} />,
            label: 'Reportes',
            path: '#reportes',
            subItems: [
                { icon: <BarChart3 size={18} />, label: 'Utilidades', path: '/reportes/utilidades' },
            ]
        }] : []),
        ...(isStaff ? [{
            icon: <Settings size={20} />,
            label: 'Sistema',
            path: '#sistema',
            subItems: [
                { icon: <Users size={18} />,  label: 'Usuarios', path: '/sistema/usuarios' },
                { icon: <Shield size={18} />, label: 'Roles',    path: '/sistema/roles' },
            ]
        }] : []),
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Settings size={24} className="logo-icon" />
                    {!collapsed && <span className="logo-text">AutoServi</span>}
                </div>
                <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir' : 'Colapsar'}>
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    {!collapsed && <p className="nav-title">Menú Principal</p>}
                    <ul className="nav-list">
                        {menuItems.map((item) => (
                            <li key={item.label}>
                                <button
                                    onClick={() => {
                                        if (item.subItems) {
                                            if (collapsed) setCollapsed(false);
                                            toggleSubMenu(item.label);
                                        } else {
                                            navigate(item.path);
                                        }
                                    }}
                                    className={`nav-item w-full text-left bg-transparent border-none cursor-pointer flex justify-between items-center ${isActive(item.path) && !item.subItems ? 'active' : ''}`}
                                    title={collapsed ? item.label : ''}
                                >
                                    <div className="flex items-center">
                                        <span className="nav-icon">{item.icon}</span>
                                        {!collapsed && <span className="nav-label">{item.label}</span>}
                                    </div>
                                    {!collapsed && item.subItems && (
                                        <span className="text-slate-400">
                                            {expandedMenu[item.label] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </span>
                                    )}
                                </button>

                                {!collapsed && item.subItems && expandedMenu[item.label] && (
                                    <ul className="mt-1 mb-2 ml-9 border-l border-slate-700 pl-2 space-y-1">
                                        {item.subItems.map(subItem => (
                                            <li key={subItem.path}>
                                                <button
                                                    onClick={() => navigate(subItem.path)}
                                                    className={`w-full text-left flex items-center py-2 px-3 rounded-md text-sm cursor-pointer transition-colors ${
                                                        isActive(subItem.path)
                                                            ? 'bg-blue-600/10 text-blue-400 font-medium'
                                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                    }`}
                                                >
                                                    <span className="mr-3 opacity-70">{subItem.icon}</span>
                                                    {subItem.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </nav>
        </aside>
    );
}
