import React, { createContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

/**
 * Detecta si estamos en modo "superadmin SaaS" (panel admin) vs modo normal
 * (dashboard del taller). Basado en el hostname:
 *
 *   - admin.localhost          → modo admin (panel SaaS)
 *   - admin.autoservipro.com   → modo admin
 *   - demo.localhost           → modo tenant (taller "demo")
 *   - 10.62.112.130            → modo tenant (IP directa = tenant por IP)
 *
 * Permitimos override vía ?mode=admin en la URL (útil para testing local sin
 * tocar /etc/hosts).
 */
function detectAuthMode() {
    if (typeof window === 'undefined') return 'tenant';
    const host = window.location.hostname || '';
    const search = window.location.search || '';
    if (/^admin\./i.test(host)) return 'admin';
    if (/[?&]mode=admin(&|$)/i.test(search)) return 'admin';
    return 'tenant';
}

/**
 * Config por modo: qué endpoints usar para login y fetch del user.
 */
const MODE_CONFIG = {
    tenant: {
        loginUrl: '/api/v1/token/',
        meUrl: '/api/v1/usuarios/me/',
        loginField: 'username',
        storageKey: 'authTokens',
    },
    admin: {
        loginUrl: '/api/v1/public-admin/token/',
        meUrl: '/api/v1/public-admin/me/',
        loginField: 'email',
        storageKey: 'adminAuthTokens',
    },
};

export const AuthProvider = ({ children }) => {
    const authMode = useMemo(() => detectAuthMode(), []);
    const config = MODE_CONFIG[authMode];

    const [user, setUser] = useState(null);
    const [authTokens, setAuthTokens] = useState(() => {
        const raw = localStorage.getItem(config.storageKey);
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(true);

    const loginUser = async (identifier, password) => {
        try {
            const payload = {
                [config.loginField]: identifier,
                password,
            };
            const response = await axios.post(config.loginUrl, payload);
            if (response.status === 200) {
                setAuthTokens(response.data);
                localStorage.setItem(config.storageKey, JSON.stringify(response.data));
                // El endpoint admin ya retorna `user` en el payload del token.
                if (response.data.user) {
                    setUser(response.data.user);
                } else {
                    await fetchUser(response.data.access);
                }
                return true;
            }
        } catch (error) {
            console.error("Error validando credenciales", error);
            return false;
        }
    };

    const logoutUser = () => {
        setAuthTokens(null);
        setUser(null);
        localStorage.removeItem(config.storageKey);
    };

    const fetchUser = async (token) => {
        try {
            const response = await axios.get(config.meUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUser(response.data);
        } catch (error) {
            console.error("Error fetching user", error);
            logoutUser();
        }
    };

    useEffect(() => {
        const init = async () => {
            if (authTokens) {
                await fetchUser(authTokens.access);
            }
            setLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const contextData = {
        user,
        authTokens,
        loginUser,
        logoutUser,
        authMode,
        isAdminMode: authMode === 'admin',
    };

    return (
        <AuthContext.Provider value={contextData}>
            {loading ? null : children}
        </AuthContext.Provider>
    );
};
