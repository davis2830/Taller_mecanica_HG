/**
 * Configuración centralizada del host del backend.
 *
 * Por defecto el frontend usa URLs relativas (`/api/v1/...`) — esto
 * funciona en dev a través del proxy de Vite y en producción detrás
 * de un Nginx que sirva el SPA y haga proxy_pass de `/api/`, `/media/`
 * y `/static/` al backend Django.
 *
 * Si por alguna razón querés que el frontend hable con un backend en
 * otro host (ej. dominio distinto, sin proxy), basta con definir
 * `VITE_API_BASE_URL` en `frontend/.env`:
 *
 *   VITE_API_BASE_URL=http://192.168.0.6:8000
 *
 * y volver a buildear el frontend (`npm run build`).
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Construye una URL absoluta hacia el backend prepending el host
 * configurado. Si `VITE_API_BASE_URL` no está seteado, devuelve la
 * ruta relativa intacta.
 *
 * @example
 *   apiUrl('/api/v1/usuarios/me/')          // '/api/v1/usuarios/me/'
 *   apiUrl('/media/usuarios/avatares/x.jpg') // 'http://192.168.0.6:8000/media/...'
 */
export function apiUrl(path) {
    if (!path) return API_BASE_URL || '';
    if (/^https?:\/\//i.test(path)) return path; // ya es absoluta
    if (!API_BASE_URL) return path;               // dev / mismo origen
    const sep = path.startsWith('/') ? '' : '/';
    return `${API_BASE_URL}${sep}${path}`;
}
