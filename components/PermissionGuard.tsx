import { ReactNode } from 'react';
import { useAuthUser } from '../hooks/usePermissions';
import { useNavigation, NavigationProp } from '@react-navigation/native';

type RootStackParamList = {
    Login: undefined;
    Unauthorized: undefined;
    [key: string]: undefined | object;
};

interface PermissionGuardProps {
    children: ReactNode;
    requiredPermission?: string;
    requiredRole?: string;
    fallbackPath?: keyof RootStackParamList;
}

export function PermissionGuard({ 
    children, 
    requiredPermission, 
    requiredRole,
    fallbackPath = 'Login'
}: PermissionGuardProps) {
    const { hasPermission, hasRole, loading, isAuthenticated } = useAuthUser();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    if (loading) {
        return <div>Loading...</div>; // You can replace this with a proper loading component
    }

    if (!isAuthenticated) {
        navigation.navigate(fallbackPath as string, undefined);
        return null;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        navigation.navigate('Unauthorized', undefined);
        return null;
    }

    if (requiredRole && !hasRole(requiredRole)) {
        navigation.navigate('Unauthorized', undefined);
        return null;
    }

    return <>{children}</>;
} 