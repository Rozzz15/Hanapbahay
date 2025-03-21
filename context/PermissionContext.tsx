import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PermissionsContextType {
    permissions: string[];
    setPermissions: (permissions: string[]) => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const [permissions, setPermissions] = useState<string[]>([]);

    return (
        <PermissionsContext.Provider value={{ permissions, setPermissions }}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}