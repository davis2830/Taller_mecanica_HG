import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import routes from './config/routes';

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
 * AppRoutes - Componente que renderiza todas las rutas
 * Lee desde config/routes.js
 */
function AppRoutes() {
    const { user } = useContext(AuthContext);

    return (
        <Routes>
            {/* Generar rutas dinámicamente desde routes.js */}
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
                            <Layout>
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
 * App - Componente raíz
 */
function App() {
    return (
        <Router>
            <ThemeProvider>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}

export default App;
