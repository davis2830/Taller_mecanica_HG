import { Capacitor } from '@capacitor/core';

/**
 * Configuración centralizada del host del backend.
 *
 * - Web (dev): URLs relativas → proxy de Vite las reenvía a Django.
 * - Web (prod): URLs relativas → Nginx hace proxy_pass.
 * - App nativa (Capacitor): No hay proxy, necesita URL absoluta.
 *   Se configura con VITE_API_BASE_URL en frontend/.env antes de build.
 *
 * Ejemplo en frontend/.env para build de la app:
 *   VITE_API_BASE_URL=https://demo.gctorque.com
 */
function _resolveBaseUrl() {
    const env = import.meta.env.VITE_API_BASE_URL || '';
    if (env) return env;
    // En app nativa sin VITE_API_BASE_URL, URLs relativas no funcionan.
    if (Capacitor.isNativePlatform()) {
        console.warn(
            '[apiBase] App nativa sin VITE_API_BASE_URL — las peticiones ' +
            'a la API fallarán. Definí VITE_API_BASE_URL en frontend/.env ' +
            'antes de hacer build.',
        );
    }
    return '';
}

export const API_BASE_URL = _resolveBaseUrl();

/** true cuando la app corre dentro de Capacitor (Android/iOS). */
export const IS_NATIVE = Capacitor.isNativePlatform();

/**
 * Construye una URL absoluta hacia el backend prepending el host
 * configurado. Si `VITE_API_BASE_URL` no está seteado, devuelve la
 * ruta relativa intacta (funciona en web con proxy).
 */
export function apiUrl(path) {
    if (!path) return API_BASE_URL || '';
    if (/^https?:\/\//i.test(path)) return path; // ya es absoluta
    if (!API_BASE_URL) return path;               // dev / mismo origen
    const sep = path.startsWith('/') ? '' : '/';
    return `${API_BASE_URL}${sep}${path}`;
}
