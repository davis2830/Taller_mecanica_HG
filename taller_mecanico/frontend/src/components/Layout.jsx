import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import '../styles/layout.css';

/**
 * Componente Layout - Estructura base (equivalente a base.html en Django)
 * 
 * Este componente envuelve toda la aplicación y proporciona:
 * - Sidebar fijo con navegación
 * - Header consistente
 * - Footer consistente
 * - Estructura de página estandarizada
 * - Manejo automático de visibilidad según autenticación
 * 
 * Uso:
 * <Layout>
 *   <MiComponente />
 * </Layout>
 */
export default function Layout({ children, showHeader = true, showFooter = true, fullHeight = false }) {
    const { user } = useContext(AuthContext);

    return (
        <div className={`layout-container ${fullHeight ? 'full-height' : ''}`}>
            {/* Sidebar - Solo mostrar si está autenticado */}
            {user && <AppSidebar />}

            {/* Wrapper para Header y Main */}
            <div className="layout-wrapper">
                {/* Header - Solo mostrar si está autenticado y showHeader es true */}
                {user && showHeader && <AppHeader />}

                {/* Main Content */}
                <main className="layout-main">
                    {children}
                </main>
            </div>
        </div>
    );
}
