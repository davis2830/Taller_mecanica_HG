import React, { createContext, useContext, useState, useCallback } from 'react';

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggleMobileSidebar = useCallback(() => {
        setMobileOpen(prev => !prev);
    }, []);

    const closeMobileSidebar = useCallback(() => {
        setMobileOpen(false);
    }, []);

    return (
        <SidebarContext.Provider value={{ mobileOpen, toggleMobileSidebar, closeMobileSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    return useContext(SidebarContext);
}
