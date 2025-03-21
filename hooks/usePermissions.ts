import { useEffect, useState } from 'react';
import { getAuthUser, AuthUser } from '../utils/auth-user';

export function useAuthUser() {
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAuthUser = async () => {
            const user = await getAuthUser();
            setAuthUser(user);
            setLoading(false);
        };
        loadAuthUser();
    }, []);

    const hasPermission = (permission: string) => {
        return authUser?.permissions.includes(permission) ?? false;
    };

    const hasRole = (role: string) => {
        return authUser?.roles.includes(role) ?? false;
    };

    return {
        authUser,
        loading,
        hasPermission,
        hasRole,
        isAuthenticated: !!authUser
    };
} 