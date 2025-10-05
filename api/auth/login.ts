import { z } from "zod";
import { mockSignIn } from '../../utils/mock-auth';
import { Alert } from 'react-native';

// Define allowed roles
const roles = ["official", "tenant", "host"] as const;

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginData = z.infer<typeof loginSchema>;

// Login function using mock authentication
export async function loginUser(data: LoginData) {
    try {
        loginSchema.parse(data);

        const result = await mockSignIn(data.email, data.password);

        if (!result.success) {
            throw new Error(result.error || "Invalid email or password");
        }

        // The mockSignIn function already stores the user data
        // So we just need to return success
        return { 
            success: true, 
            roles: result.user?.roles || [],
            permissions: [],
            user: result.user
        };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        console.error("Login error:", message);
        return {
            success: false,
            error: message
        };
    }
}
