import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Calendar, Clipboard, Settings, ChevronDown, ChevronRight, List, Car, Users, Wrench, Truck, TrendingUp, Hammer, Receipt, Package, Archive, ArrowRightLeft, LayoutList, ShoppingCart } from 'lucide-react';
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
};

const STORAGE_KEY = 'sidebar_expanded';

function getInitialExpanded(pathname) {
    // Try persisted state first
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    // Fall back to auto-expand based on current route
    const section = ROUTE_SECTION_MAP[pathname];
    return section ? { [section]: true } : {};
}

export default function AppSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const [collapsed, setCollapsed] = useState(false);
    const [expandedMenu, setExpandedMenu] = useState(() => getInitialExpanded(location.pathname));
    const isStaff = user?.is_staff;

    // Auto-expand parent section when route changes (e.g. navigating via link)
    useEffect(() => {
        const section = ROUTE_SECTION_MAP[location.pathname];
        if (section) {
            setExpandedMenu(prev => {
                const next = { ...prev, [section]: true };
                // Persist
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

    // No mostrar sidebar en login
    if (location.pathname === '/login') return null;

    // Definir menú items
    const menuItems = [
        {
            icon: <BarChart3 size={20} />,
            label: 'Dashboard',
            path: '/',
            badge: null
        },
        {
            icon: <Calendar size={20} />,
            label: 'Citas',
            path: '#citas',
            subItems: [
                { icon: <List size={18} />, label: 'Mis Citas', path: '/citas' },
                { icon: <Car size={18} />, label: 'Directorio y Clínica', path: '/citas/vehiculos' },
                ...(isStaff ? [{ icon: <Truck size={18} />, label: 'Nueva Recepción', path: '/citas/recepcion/nueva' }] : []),
                { icon: <Users size={18} />, label: 'Base de Clientes', path: '/citas/clientes' },
                { icon: <Calendar size={18} />, label: 'Calendario', path: '/citas/calendario' },
            ]
        },
        {
            icon: <Hammer size={20} />,
            label: 'Taller',
            path: '#taller',
            subItems: [
                { icon: <Clipboard size={18} />, label: 'Órdenes de Trabajo', path: '/kanban' },
                { icon: <Wrench size={18} />, label: 'Catálogo de Servicios', path: '/citas/servicios' },
                { icon: <List size={18} />, label: 'Historial de Órdenes', path: '/taller/historial' },
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
        {
            icon: <Package size={20} />,
            label: 'Inventario',
            path: '#inventario',
            subItems: [
                { icon: <Archive size={18} />, label: 'Productos', path: '/inventario/productos' },
                { icon: <LayoutList size={18} />, label: 'Categorías', path: '/inventario/categorias' },
                { icon: <ArrowRightLeft size={18} />, label: 'Movimientos', path: '/inventario/movimientos' },
                { icon: <ShoppingCart size={18} />, label: 'Compras y Proveedores', path: '/inventario/compras' },
            ]
        },
        ...(isStaff ? [{
            icon: <TrendingUp size={20} />,
            label: 'Reportes',
            path: '#reportes',
            subItems: [
                { icon: <BarChart3 size={18} />, label: 'Utilidades', path: '/reportes/utilidades' },
            ]
        }] : []),
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Header del Sidebar */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Settings size={24} className="logo-icon" />
                    {!collapsed && <span className="logo-text">AutoServi</span>}
                </div>
                <button 
                    className="collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expandir' : 'Colapsar'}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* Menú principal */}
            <nav className="sidebar-nav">
                <div className="nav-section">
                    {!collapsed && <p className="nav-title">Menú Principal</p>}
                    <ul className="nav-list">
                        {menuItems.map((item) => (
                            <li key={item.label}>
                                <button
                                    onClick={() => {
                                        if (item.subItems) {
                                            if (collapsed) setCollapsed(false); // Auto expandir sidebar si está cerrado
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

                                {/* Renderizar sub-menús */}
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
