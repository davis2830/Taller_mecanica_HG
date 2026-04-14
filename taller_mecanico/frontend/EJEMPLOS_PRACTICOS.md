/**
 * ============================================================
 * EJEMPLOS PRÁCTICOS - Cómo usar el estándar
 * ============================================================
 */

// ============================================================
// EJEMPLO 1: CREAR UNA PÁGINA DE PERFIL DE USUARIO
// ============================================================

/**
 * PASO 1: Crear el componente
 * Archivo: src/pages/ProfilePage.jsx
 */

import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function ProfilePage() {
    const { user } = useContext(AuthContext);

    return (
        <div className="profile-page">
            <h1>Mi Perfil</h1>
            <div className="profile-card">
                <h2>{user.nombre}</h2>
                <p>Email: {user.email}</p>
                <p>Rol: {user.rol}</p>
                <button>Editar Perfil</button>
            </div>
        </div>
    );
}

/**
 * PASO 2: Agregar la ruta en config/routes.js
 * 
 * Simplemente agregar esto al array routes:
 */

const newRoute = {
    path: '/perfil',
    element: ProfilePage,
    private: true,
    layout: true,
    title: 'Mi Perfil'
};

/**
 * PASO 3: (OPCIONAL) Agregar al header en AppHeader.jsx
 * 
 * Simplemente agregar esto en la navegación:
 * <a href="/perfil" className="nav-link">
 *     👤 Mi Perfil
 * </a>
 */

/**
 * ¡LISTO! Ya funciona automáticamente:
 * - La ruta /perfil está disponible
 * - Solo usuarios autenticados pueden acceder
 * - Usa el Layout (header + footer)
 * - La página hereda estilos del layout
 */

// ============================================================
// EJEMPLO 2: CREAR UNA PÁGINA SIN LAYOUT (Como Login)
// ============================================================

/**
 * A veces quieres una página sin header ni footer
 * (Como login, register, forgot-password)
 */

import React, { useState } from 'react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');

    return (
        <div className="forgot-password-page">
            <h1>Recuperar Contraseña</h1>
            <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu email"
            />
            <button>Enviar Link</button>
        </div>
    );
}

/**
 * En config/routes.js:
 */

const forgotRoute = {
    path: '/olvide-contraseña',
    element: ForgotPasswordPage,
    private: false,      // No requiere login
    layout: false,       // Sin header ni footer
    title: 'Recuperar Contraseña'
};

// ============================================================
// EJEMPLO 3: CAMBIAR EL HEADER/FOOTER GLOBALMENTE
// ============================================================

/**
 * Una de las ventajas principales es que cambios en
 * AppHeader.jsx o AppFooter.jsx se reflejan en TODAS
 * las páginas automáticamente.
 * 
 * Ejemplo: Agregar un botón "Notificaciones" al header
 */

// En src/components/AppHeader.jsx, agregar:

function AppHeader() {
    // ... código existente ...
    
    return (
        <header className="app-header">
            <div className="header-container">
                {/* Logo */}
                {/* Nav */}
                
                {/* NUEVO: Botón de notificaciones */}
                <button className="notification-btn">
                    🔔 Notificaciones <span className="badge">3</span>
                </button>
                
                {/* User Info */}
            </div>
        </header>
    );
}

/**
 * ¡Eso es! El botón de notificaciones ahora aparece
 * en TODAS las páginas (Dashboard, Citas, Órdenes, etc.)
 * sin necesidad de cambiar nada más.
 */

// ============================================================
// EJEMPLO 4: CREAR UNA RUTA ANIDADA (Opcional)
// ============================================================

/**
 * Si necesitas subrutas, puedes hacerlo así:
 */

const reportesRoutes = [
    {
        path: '/reportes',
        element: ReportesPage,
        private: true,
        layout: true,
        title: 'Reportes'
    },
    {
        path: '/reportes/ingresos',
        element: ReportesIngresosPage,
        private: true,
        layout: true,
        title: 'Reportes de Ingresos'
    },
    {
        path: '/reportes/gastos',
        element: ReportesGastosPage,
        private: true,
        layout: true,
        title: 'Reportes de Gastos'
    }
];

// ============================================================
// EJEMPLO 5: MOSTRAR/OCULTAR PARTES DEL LAYOUT
// ============================================================

/**
 * El Layout.jsx acepta parámetros para mayor control:
 */

// Opción 1: Con header y footer (por defecto)
<Layout>
    <Dashboard />
</Layout>

// Opción 2: Sin footer (para páginas largas)
<Layout showFooter={false}>
    <LargePage />
</Layout>

// Opción 3: Sin header ni footer
<Layout showHeader={false} showFooter={false}>
    <SpecialPage />
</Layout>

// Opción 4: Pantalla completa (sin padding, full height)
<Layout fullHeight>
    <Editor />
</Layout>

// ============================================================
// COMPARACIÓN: ANTES vs DESPUÉS
// ============================================================

/**
 * ANTES (sin estándar - caótico):
 * 
 * App.jsx:
 * <Routes>
 *   <Route path="/login" element={<Login />} />
 *   <Route path="/" element={
 *     <div>
 *       <Header />
 *       <Dashboard />
 *       <Footer />
 *     </div>
 *   } />
 *   <Route path="/citas" element={
 *     <div>
 *       <Header />
 *       <CitasCalendar />
 *       <Footer />
 *     </div>
 *   } />
 *   // ... etc, código repetido
 * </Routes>
 */

/**
 * DESPUÉS (con estándar - limpio):
 * 
 * App.jsx:
 * <Routes>
 *   {routes.map(route => (
 *     <Route
 *       key={route.path}
 *       path={route.path}
 *       element={
 *         <PrivateRoute isPrivate={route.private}>
 *           {route.layout ? (
 *             <Layout>
 *               <route.element />
 *             </Layout>
 *           ) : (
 *             <route.element />
 *           )}
 *         </PrivateRoute>
 *       }
 *     />
 *   ))}
 * </Routes>
 */

// ============================================================
// TIPS Y BUENAS PRÁCTICAS
// ============================================================

/**
 * 1. MANTÉN config/routes.js SIMPLE
 *    - Solo importa componentes
 *    - No agregues lógica compleja
 *    - Úsalo como referencia visual
 * 
 * 2. USA NOMBRES DESCRIPTIVOS
 *    - /perfil (no /p)
 *    - /citas (no /c)
 *    - /reportes/ingresos (no /r/i)
 * 
 * 3. AGRUPA RUTAS RELACIONADAS
 *    - Reportes con subrutas
 *    - Admin con subrutas
 *    - etc.
 * 
 * 4. DOCUMENTACIÓN
 *    - Comenta rutas complejas
 *    - Explica por qué no usan layout
 * 
 * 5. CONSISTENCIA
 *    - Todas las páginas privadas usan Layout
 *    - Todas las páginas públicas sin Layout
 *    - Excepción = Documentar el porqué
 */

export default {};
