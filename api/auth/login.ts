import { z } from "zod";
import { supabase } from '../../utils/supabase-client';
import { storeAuthUser } from '../../utils/auth-user';
import { Alert } from 'react-native';

// Define allowed roles
const roles = ["official", "tenant", "host"] as const;

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginData = z.infer<typeof loginSchema>;

// Login function
export async function loginUser(data: LoginData) {
    try {
        loginSchema.parse(data);

        const { data: user, error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
        });

        if (error) throw new Error("Invalid email or password");

        // Fetch user roles and permissions in parallel
        const [rolesResult, permissionsResult] = await Promise.all([
            // Get user roles
            supabase
                .from('user_has_roles')
                .select(`
                    roles (name)
                `)
                .eq('user_id', user.user.id),

            // Get user permissions (combining role permissions and direct user permissions)
            supabase
                .from('user_has_permissions')
                .select(`
                    permissions (name)
                `)
                .eq('user_id', user.user.id)
        ]);

        if (rolesResult.error) throw new Error("Failed to fetch user roles");
        if (permissionsResult.error) throw new Error("Failed to fetch user permissions");

        // Extract role and permission names
        const roles = rolesResult.data?.map(r => r.roles.name) || [];
        const permissions = permissionsResult.data?.map(p => p.permissions.name) || [];

        // Store auth user data
        await storeAuthUser({
            id: user.user.id,
            roles,
            permissions
        });

        return { 
            success: true, 
            roles,
            permissions
        };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        Alert.alert("Login Error", message);
        return {
            success: false,
            error: message
        };
    }
}
