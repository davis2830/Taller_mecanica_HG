import React, { createContext, useState, useContext, useEffect } from 'react';

/**
 * ThemeContext - Maneja el tema oscuro/claro de la aplicación
 * 
 * Proporciona:
 * - theme: 'dark' | 'light'
 * - toggleTheme(): función para cambiar tema
 * - isDark: booleano para verificar si es oscuro
 */
export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Cargar tema guardado o usar oscuro por defecto
        const saved = localStorage.getItem('theme');
        return saved || 'dark';
    });

    // Guardar tema cuando cambia
    useEffect(() => {
        localStorage.setItem('theme', theme);
        
        // Aplicar clase al documento
        const html = document.documentElement;
        if (theme === 'dark') {
            html.classList.add('dark-theme');
            html.classList.remove('light-theme');
        } else {
            html.classList.add('light-theme');
            html.classList.remove('dark-theme');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme debe ser usado dentro de ThemeProvider');
    }
    return context;
}
