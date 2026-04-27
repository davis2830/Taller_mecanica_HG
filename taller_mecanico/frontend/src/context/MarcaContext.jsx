import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

/**
 * MarcaContext — datos de branding del taller (logo + nombre).
 *
 * Se carga una vez al montar la app desde el endpoint público
 * `GET /api/v1/marca/` (no requiere auth) y queda disponible en todas
 * las pantallas vía `useMarca()`.
 *
 * Cuando el admin edita la marca en *Sistema → Configuración del Taller*,
 * llamamos a `refreshMarca()` para que sidebar/header/login actualicen
 * sin recargar la página.
 */

const DEFAULT_MARCA = {
    nombre_empresa: '',
    logo_url: null,
    loaded: false,
};

export const MarcaContext = createContext({
    marca: DEFAULT_MARCA,
    refresh: () => {},
});

// Pequeño bus pub/sub para que componentes que NO usan el context
// (p. ej. ConfiguracionTallerPage al guardar) puedan disparar refresh.
const listeners = new Set();
export function refreshMarca() {
    listeners.forEach(fn => fn());
}

export function MarcaProvider({ children }) {
    const [marca, setMarca] = useState(DEFAULT_MARCA);

    const fetchMarca = useCallback(async () => {
        try {
            const res = await axios.get('/api/v1/marca/');
            setMarca({
                nombre_empresa: res.data?.nombre_empresa || '',
                logo_url: res.data?.logo_url || null,
                loaded: true,
            });
        } catch {
            // Sin auth, este endpoint no debería fallar — si falla, dejamos
            // los valores por defecto y la app sigue funcionando.
            setMarca(m => ({ ...m, loaded: true }));
        }
    }, []);

    useEffect(() => { fetchMarca(); }, [fetchMarca]);

    useEffect(() => {
        listeners.add(fetchMarca);
        return () => { listeners.delete(fetchMarca); };
    }, [fetchMarca]);

    return (
        <MarcaContext.Provider value={{ marca, refresh: fetchMarca }}>
            {children}
        </MarcaContext.Provider>
    );
}

export function useMarca() {
    return useContext(MarcaContext);
}
