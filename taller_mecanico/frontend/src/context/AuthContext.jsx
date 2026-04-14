import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authTokens, setAuthTokens] = useState(() => 
        localStorage.getItem('authTokens') ? JSON.parse(localStorage.getItem('authTokens')) : null
    );
    const [loading, setLoading] = useState(true);

    const loginUser = async (username, password) => {
        try {
            const response = await axios.post('http://localhost:8000/api/v1/token/', {
                username,
                password
            });
            if (response.status === 200) {
                setAuthTokens(response.data);
                localStorage.setItem('authTokens', JSON.stringify(response.data));
                await fetchUser(response.data.access);
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
        localStorage.removeItem('authTokens');
    };

    const fetchUser = async (token) => {
        try {
            const response = await axios.get('http://localhost:8000/api/v1/usuarios/me/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setUser(response.data);
        } catch (error) {
            console.error("Error fetching user", error);
            logoutUser();
        }
    };

    useEffect(() => {
        if (authTokens) {
            fetchUser(authTokens.access);
        }
        setLoading(false);
    }, []);

    const contextData = {
        user,
        authTokens,
        loginUser,
        logoutUser
    };

    return (
        <AuthContext.Provider value={contextData}>
            {loading ? null : children}
        </AuthContext.Provider>
    );
};
