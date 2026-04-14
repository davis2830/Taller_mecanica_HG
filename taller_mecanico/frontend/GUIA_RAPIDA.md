/**
 * ============================================================
 * GUÍA RÁPIDA DE REFERENCIA - Quick Start
 * ============================================================
 */

// ============================================================
// 1. ESTRUCTURA DE CARPETAS (para referencia rápida)
// ============================================================

/**
 * src/
 * ├── config/
 * │   └── routes.js                    👈 EDITAR AQUÍ para agregar rutas
 * │
 * ├── components/
 * │   ├── Layout.jsx                   👈 Estructura base
 * │   ├── AppHeader.jsx                👈 Editar para cambios globales
 * │   ├── AppFooter.jsx                👈 Editar para cambios globales
 * │   ├── KanbanColumn.jsx
 * │   ├── KanbanTask.jsx
 * │   └── NuevaCitaSlideOver.jsx
 * │
 * ├── pages/
 * │   ├── Login.jsx                    (sin Layout)
 * │   ├── Dashboard.jsx                (con Layout)
 * │   ├── CitasCalendar.jsx            (con Layout)
 * │   ├── KanbanBoard.jsx              (con Layout)
 * │   └── [TU NUEVA PÁGINA].jsx        👈 Agregar aquí nuevas páginas
 * │
 * ├── context/
 * │   └── AuthContext.jsx
 * │
 * ├── styles/
 * │   ├── layout.css
 * │   ├── app-header.css
 * │   ├── app-footer.css
 * │   └── [otros estilos].css
 * │
 * ├── App.jsx                          (NO TOCAR - ya está optimizado)
 * └── main.jsx
 */

// ============================================================
// 2. AGREGAR UNA NUEVA PÁGINA (Paso a Paso)
// ============================================================

/**
 * TAREA: Crear una página de Configuración
 * 
 * PASO 1: Crear el componente
 * ────────────────────────────────────
 * Archivo: src/pages/SettingsPage.jsx
 */

// src/pages/SettingsPage.jsx
import React from 'react';

export default function SettingsPage() {
    return (
        <div className="settings-page">
            <h1>Configuración</h1>
            <p>Contenido de configuración aquí...</p>
        </div>
    );
}

/**
 * PASO 2: Registrar en config/routes.js
 * ────────────────────────────────────
 * Abre: src/config/routes.js y agrega:
 */

import SettingsPage from '../pages/SettingsPage';

export const routes = [
    // ... rutas existentes ...
    {
        path: '/configuracion',
        element: SettingsPage,
        private: true,
        layout: true,
        title: 'Configuración'
    }
];

/**
 * PASO 3: (Opcional) Agregar al header
 * ────────────────────────────────────
 * En src/components/AppHeader.jsx, agregar a .header-nav:
 */

// <a href="/configuracion" className="nav-link">
//     ⚙️ Configuración
// </a>

/**
 * ¡LISTO! Ya está funcionando:
 * ✅ Accesible en http://localhost:5173/configuracion
 * ✅ Requiere autenticación
 * ✅ Muestra header y footer
 * ✅ Estilos aplicados automáticamente
 */

// ============================================================
// 3. FLUJO DE DATOS (Cómo funciona)
// ============================================================

/**
 * USUARIO ACCEDE A /configuracion
 * │
 * ├─ App.jsx recibe la URL
 * │
 * ├─ Lee config/routes.js
 * │
 * ├─ Busca ruta con path: '/configuracion'
 * │
 * ├─ Verifica:
 * │  ├─ ¿Requiere autenticación? (private: true)
 * │  ├─ ¿Necesita Layout? (layout: true)
 * │
 * ├─ Renderiza:
 * │  ├─ <Layout>
 * │  │   ├─ <AppHeader />        👈 Header global
 * │  │   ├─ <main>
 * │  │   │   ├─ <SettingsPage /> 👈 Tu contenido
 * │  │   │ </main>
 * │  │   ├─ <AppFooter />        👈 Footer global
 * │  │ </Layout>
 * │
 * └─ Muestra al usuario ✅
 */

// ============================================================
// 4. CONTROL DE AUTENTICACIÓN
// ============================================================

/**
 * private: true   → Requiere login, redirige a /login si no está autenticado
 * private: false  → Página pública, accesible sin login
 * 
 * layout: true    → Muestra header y footer
 * layout: false   → Pantalla completa (sin header ni footer)
 */

// Ejemplos:

// Página pública sin Layout (Login)
{
    path: '/login',
    element: Login,
    private: false,
    layout: false
}

// Página privada con Layout (Dashboard)
{
    path: '/',
    element: Dashboard,
    private: true,
    layout: true
}

// Página pública sin Layout (Info)
{
    path: '/info',
    element: InfoPage,
    private: false,
    layout: false
}

// Página privada sin Layout (Editor especial)
{
    path: '/editor',
    element: Editor,
    private: true,
    layout: false
}

// ============================================================
// 5. CAMBIOS GLOBALES (Afectan toda la app)
// ============================================================

/**
 * ¿Quieres cambiar el header en TODAS las páginas?
 * → Edita AppHeader.jsx
 * 
 * ¿Quieres agregar colores globales?
 * → Edita src/index.css
 * 
 * ¿Quieres cambiar rutas?
 * → Edita config/routes.js
 * 
 * ¿Quieres cambiar el layout estructura?
 * → Edita components/Layout.jsx
 */

// ============================================================
// 6. CARACTERÍSTICAS ESPECIALES
// ============================================================

/**
 * A. REDIRECCIONES AUTOMÁTICAS
 *    └─ Si estás en /login y autenticado → Redirige a /
 * 
 * B. RUTAS 404
 *    └─ URL no existe → Redirige a /
 * 
 * C. PROTECCIÓN DE RUTAS
 *    └─ Página privada sin login → Redirige a /login
 * 
 * D. MOSTRAR/OCULTAR HEADER Y FOOTER
 *    └─ Layout showHeader={false} showFooter={false}
 * 
 * E. FULL HEIGHT
 *    └─ Layout fullHeight (ocupa toda la pantalla)
 */

// ============================================================
// 7. CHEATSHEET - Comandos Útiles
// ============================================================

/**
 * CREAR NUEVA PÁGINA:
 * 
 * 1. touch src/pages/NombrePagePage.jsx
 * 2. Copiar estructura básica
 * 3. Agregar en config/routes.js
 * 4. (Opcional) Agregar en AppHeader.jsx
 * 
 * CAMBIAR ORDEN DE NAVEGACIÓN:
 * 
 * Editar la posición en config/routes.js
 * (aparecerán en orden en el header)
 * 
 * HACER PÁGINA PRIVADA:
 * 
 * Cambiar: private: false
 * Usar:    private: true
 * 
 * HACER PÁGINA PÚBLICA:
 * 
 * Cambiar: private: true
 * Usar:    private: false
 * 
 * OCULTAR HEADER EN UNA PÁGINA:
 * 
 * En esa página, envolver con:
 * <Layout showHeader={false}>
 *   <MiContenido />
 * </Layout>
 */

// ============================================================
// 8. TROUBLESHOOTING
// ============================================================

/**
 * PROBLEMA: Ruta no funciona
 * SOLUCIÓN:
 * 1. Verificar config/routes.js
 * 2. Verificar que el componente existe
 * 3. Verificar que está importado correctamente
 * 4. Usar herramientas dev de React para debug
 * 
 * PROBLEMA: Header no aparece
 * SOLUCIÓN:
 * 1. Verificar que layout: true en routes.js
 * 2. Verificar que user está autenticado
 * 3. Revisar AppHeader.jsx
 * 
 * PROBLEMA: Estilos no se aplican
 * SOLUCIÓN:
 * 1. Verificar que el archivo CSS existe
 * 2. Verificar que está importado
 * 3. Verificar nombres de clases
 * 4. Limpiar caché del navegador (Ctrl+F5)
 * 
 * PROBLEMA: Ruta privada no protege
 * SOLUCIÓN:
 * 1. Verificar private: true en routes.js
 * 2. Revisar PrivateRoute en App.jsx
 * 3. Verificar que AuthContext funciona
 */

// ============================================================
// 9. MEJORES PRÁCTICAS
// ============================================================

/**
 * ✅ DO:
 * - Mantén routes.js simple y limpio
 * - Usa nombres descriptivos
 * - Comenta rutas especiales
 * - Agrupa rutas relacionadas
 * - Reutiliza componentes
 * 
 * ❌ DON'T:
 * - No metas lógica en routes.js
 * - No cambies App.jsx sin razón
 * - No duplices código del Layout
 * - No crees rutas sin documentación
 * - No olvides agregar al header
 */

// ============================================================
// 10. PRÓXIMOS PASOS
// ============================================================

/**
 * 1. Agrega la página de Perfil
 * 2. Agrega la página de Configuración
 * 3. Agrega la página de Ayuda
 * 4. Customiza los estilos del header
 * 5. Agrega más funcionalidades
 * 
 * Cada vez que agregues algo:
 * 1. Crea el componente
 * 2. Agrega la ruta
 * 3. ¡Listo! Automáticamente funciona
 */

export default {};
