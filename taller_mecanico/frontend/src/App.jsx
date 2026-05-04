import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MarcaProvider } from './context/MarcaContext';
import Layout from './components/Layout';
import routes from './config/routes';
import adminRoutes from './config/adminRoutes';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';

/**
 * PrivateRoute - Componente para proteger rutas
 * Solo permite acceso si el usuario está autenticado
 */
const PrivateRoute = ({ children, isPrivate }) => {
    const { user } = useContext(AuthContext);
    if (isPrivate && !user) {
        return <Navigate to="/login" />;
    }
    return children;
};

/**
 * AdminAppRoutes - Rutas del panel superadmin SaaS.
 * Se monta cuando AuthContext.isAdminMode === true.
 */
function AdminAppRoutes() {
    const { user } = useContext(AuthContext);

    return (
        <Routes>
            {/* Login público sin AdminLayout */}
            <Route
                path="/login"
                element={user ? <Navigate to="/" /> : <AdminLogin />}
            />

            {/* Rutas privadas con AdminLayout + Outlet */}
            <Route
                element={
                    user ? <AdminLayout /> : <Navigate to="/login" />
                }
            >
                {adminRoutes
                    .filter((r) => r.private)
                    .map((route) => (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={<route.element />}
                        />
                    ))}
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

/**
 * TenantAppRoutes - Rutas del dashboard del taller (modo normal).
 * Lee desde config/routes.js.
 */
function TenantAppRoutes() {
    const { user } = useContext(AuthContext);

    return (
        <Routes>
            {routes.map((route) => {
                // Si es una ruta privada y el usuario está en login, redirigir a dashboard
                if (!route.private && user && route.path === '/login') {
                    return (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={<Navigate to="/" />}
                        />
                    );
                }

                // Renderizar con Layout si lo requiere
                const element = (
                    <PrivateRoute isPrivate={route.private}>
                        {route.layout ? (
                            <Layout fullHeight={route.fullHeight}>
                                <route.element />
                            </Layout>
                        ) : (
                            <route.element />
                        )}
                    </PrivateRoute>
                );

                return (
                    <Route
                        key={route.path}
                        path={route.path}
                        element={element}
                    />
                );
            })}

            {/* Ruta 404 - Redirigir a home */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

/**
 * AppRoutes - Router principal. Switchea entre modo tenant (taller) y
 * modo admin (panel SaaS) según ``AuthContext.isAdminMode``.
 */
function AppRoutes() {
    const { isAdminMode } = useContext(AuthContext);
    return isAdminMode ? <AdminAppRoutes /> : <TenantAppRoutes />;
}

/**
 * App - Componente raíz
 */
function App() {
    return (
        <Router>
            <ThemeProvider>
                <AuthProvider>
                    <MarcaProvider>
                        <AppRoutes />
                    </MarcaProvider>
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}

export default App;
