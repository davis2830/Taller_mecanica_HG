/**
 * ============================================================
 * GUÍA DE ESTRUCTURA ESTÁNDAR - REACT (base.html equivalente)
 * ============================================================
 * 
 * Este documento explica cómo funciona la estructura estándar
 * similar a base.html en Django pero adaptada para React.
 */

/**
 * COMPARACIÓN: DJANGO vs REACT
 * 
 * DJANGO:
 * ┌─────────────────────────────────┐
 * │       base.html (plantilla)      │
 * │  - Header reutilizable           │
 * │  - {% block content %}            │
 * │  - Footer reutilizable           │
 * └─────────────────────────────────┘
 *           ↓ hereda ↓
 * ┌─────────────────────────────────┐
 * │   dashboard.html                 │
 * │   productos.html                 │
 * │   reportes.html                  │
 * └─────────────────────────────────┘
 * 
 * REACT:
 * ┌──────────────────────────────────────────┐
 * │        Layout.jsx (componente base)      │
 * │  <AppHeader />                           │
 * │  <main>{children}</main>                 │
 * │  <AppFooter />                           │
 * └──────────────────────────────────────────┘
 *           ↓ envuelve ↓
 * ┌──────────────────────────────────────────┐
 * │ <Layout>                                 │
 * │   <Dashboard />                          │
 * │   <CitasCalendar />                      │
 * │   <KanbanBoard />                        │
 * │ </Layout>                                │
 * └──────────────────────────────────────────┘
 */

// ============================================================
// PASO 1: CONFIGURACIÓN DE RUTAS (config/routes.js)
// ============================================================

/**
 * Este archivo centraliza todas las rutas de la aplicación.
 * Es como urls.py en Django.
 * 
 * ANTES (sin estándar):
 * - Rutas esparcidas por todo el código
 * - Difícil de mantener
 * - Inconsistencia
 * 
 * DESPUÉS (con estándar):
 * - Todas las rutas en UN solo archivo
 * - Fácil de visualizar la estructura
 * - Consistente y mantenible
 */

export const routes = [
    {
        path: '/login',           // URL de acceso
        element: Login,           // Componente a mostrar
        private: false,           // No requiere autenticación
        layout: false,            // No usa Layout (página completa)
        title: 'Iniciar Sesión'   // Título para SEO/metadatos
    },
    {
        path: '/',
        element: Dashboard,
        private: true,            // Requiere autenticación
        layout: true,             // Usa Layout (con header/footer)
        title: 'Dashboard'
    },
];

// ============================================================
// PASO 2: LAYOUT - Componente Base (components/Layout.jsx)
// ============================================================

/**
 * El Layout es el equivalente a base.html
 * Proporciona la estructura común a todas las páginas
 */

// Uso BÁSICO:
// <Layout>
//   <Dashboard />
// </Layout>

// Uso AVANZADO con opciones:
// <Layout 
//   showHeader={false}  // Ocultar header
//   showFooter={false}  // Ocultar footer
//   fullHeight={true}   // Ocupar toda la altura
// >
//   <MiComponente />
// </Layout>

// ============================================================
// PASO 3: COMPONENTES REUTILIZABLES
// ============================================================

/**
 * AppHeader.jsx - Header reutilizable
 * - Logo
 * - Navegación
 * - Info del usuario
 * - Menú desplegable
 * 
 * Automáticamente se muestra/oculta si el usuario está autenticado
 */

/**
 * AppFooter.jsx - Footer reutilizable
 * - Enlaces
 * - Info de la empresa
 * - Copyright
 * 
 * Automáticamente se muestra/oculta si el usuario está autenticado
 */

// ============================================================
// PASO 4: APP.jsx - El Enrutador Principal
// ============================================================

/**
 * Ahora App.jsx es más limpio y mantenible:
 * 
 * 1. Lee las rutas desde config/routes.js
 * 2. Renderiza dinámicamente cada ruta
 * 3. Aplica el Layout automáticamente si es requerido
 * 4. Protege rutas privadas
 * 5. Redirige 404s al home
 */

// ============================================================
// EJEMPLO: AGREGAR UNA NUEVA PÁGINA
// ============================================================

/**
 * Supongamos que quieres agregar una página de Perfil:
 * 
 * PASO 1: Crear el componente
 * src/pages/Profile.jsx
 */
import Profile from './pages/Profile';

/**
 * PASO 2: Agregar la ruta en config/routes.js
 */
const newRoute = {
    path: '/perfil',
    element: Profile,
    private: true,           // Solo usuarios autenticados
    layout: true,            // Usar header y footer
    title: 'Mi Perfil'
};

// Simplemente agregar a routes array:
// export const routes = [
//     ...otrasRutas,
//     newRoute
// ];

/**
 * ¡ESO ES! Ya funciona automáticamente:
 * - Se crea la ruta /perfil
 * - Se protege (requiere login)
 * - Se envuelve con Layout
 * - Aparece en el header si lo añades
 */

// ============================================================
// ESTRUCTURA DE CARPETAS RECOMENDADA
// ============================================================

/**
 * src/
 * ├── config/
 * │   └── routes.js               ← Configuración de rutas (como urls.py)
 * ├── components/
 * │   ├── Layout.jsx              ← Componente base (como base.html)
 * │   ├── AppHeader.jsx           ← Header reutilizable
 * │   ├── AppFooter.jsx           ← Footer reutilizable
 * │   ├── KanbanColumn.jsx
 * │   ├── KanbanTask.jsx
 * │   └── NuevaCitaSlideOver.jsx
 * ├── pages/
 * │   ├── Login.jsx               ← Sin Layout
 * │   ├── Dashboard.jsx           ← Con Layout
 * │   ├── CitasCalendar.jsx       ← Con Layout
 * │   ├── KanbanBoard.jsx         ← Con Layout
 * │   └── Profile.jsx             ← Con Layout (nueva página)
 * ├── context/
 * │   └── AuthContext.jsx
 * ├── styles/
 * │   ├── layout.css              ← Estilos del Layout
 * │   ├── app-header.css          ← Estilos del Header
 * │   ├── app-footer.css          ← Estilos del Footer
 * │   └── login.css
 * ├── App.jsx                     ← Enrutador principal
 * ├── index.css
 * └── main.jsx
 */

// ============================================================
// VENTAJAS DEL ESTÁNDAR
// ============================================================

/**
 * 1. MANTENIBILIDAD
 *    - Un lugar para gestionar todas las rutas
 *    - Cambios globales en header/footer en un archivo
 * 
 * 2. CONSISTENCIA
 *    - Todas las páginas con el mismo layout
 *    - Comportamiento predecible
 * 
 * 3. ESCALABILIDAD
 *    - Fácil agregar nuevas páginas
 *    - Fácil agregar nuevas rutas
 * 
 * 4. SEGURIDAD
 *    - Control centralizado de autenticación
 *    - Rutas privadas bien protegidas
 * 
 * 5. RENDIMIENTO
 *    - Componentes reutilizables
 *    - Menos duplicación de código
 */

// ============================================================
// CÓMO USAR EN TALLER_MECANICO
// ============================================================

/**
 * Tu aplicación ya tiene:
 * - Login (sin Layout)
 * - Dashboard (con Layout)
 * - CitasCalendar (con Layout)
 * - KanbanBoard (con Layout)
 * 
 * Solo agregaste:
 * - Layout.jsx (estructura base)
 * - AppHeader.jsx (header reutilizable)
 * - AppFooter.jsx (footer reutilizable)
 * - config/routes.js (configuración centralizada)
 * 
 * Y actualizaste:
 * - App.jsx (para usar el nuevo sistema)
 * 
 * Ahora puedes:
 * 
 * 1. Agregar nuevas páginas fácilmente
 * 2. Cambiar el header una sola vez y afecta todo
 * 3. Gestionar rutas de forma centralizada
 * 4. Proteger rutas privadas automáticamente
 * 5. Mantener el código consistente
 */

export default {};
