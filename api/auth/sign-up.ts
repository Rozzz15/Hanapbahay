import { z } from "zod";

// Default role is always "tenant"
export const signUpSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
});

export type SignUpData = Omit<z.infer<typeof signUpSchema>, "role">; // Remove role from user input

// Simulated user database
const usersDB: { email: string; password: string; role: string }[] = [];

// Sign-up function
export async function signUpUser(data: SignUpData) {
    signUpSchema.parse(data); // Validate input before proceeding

    return new Promise<{ success: boolean; role: string }>((resolve, reject) => {
        const timeout = Math.floor(Math.random() * (1200 - 500 + 1)) + 500;

        setTimeout(() => {
            if (usersDB.some((user) => user.email === data.email)) {
                reject(new Error("Email is already registered"));
                return;
            }

            // Save user with default role "tenant"
            usersDB.push({
                email: data.email,
                password: data.password,
                role: "tenant", // Default role
            });

            resolve({ success: true, role: "tenant" });
        }, timeout);
    });
}
