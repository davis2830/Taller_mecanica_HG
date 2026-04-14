import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, User, Settings } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import '../styles/app-header.css';

export default function AppHeader() {
    const { user, logoutUser } = useContext(AuthContext);
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    if (!user) return null; // No mostrar header en login

    return (
        <header className="app-header">
            <div className="header-container">
                {/* Breadcrumb/Title */}
                <div className="header-title">
                    <h1>Bienvenido</h1>
                </div>

                {/* Right Side - Actions */}
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <button 
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        onClick={toggleTheme}
                        title={isDark ? 'Tema claro' : 'Tema oscuro'}
                    >
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* User Info (Small) */}
                    <div className="flex items-center gap-2 border-l border-r border-slate-200 px-4">
                        <div className="h-8 w-8 rounded-md bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                            {user?.nombre?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 hidden sm:block">
                            {user?.nombre || user?.username || 'Usuario'}
                        </span>
                    </div>

                    {/* Logout Button Fixed */}
                    <button 
                        onClick={handleLogout}
                        title="Cerrar Sesión" 
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Salir</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
