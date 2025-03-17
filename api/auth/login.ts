import { z } from "zod";

// Define allowed roles
const roles = ["official", "tenant", "host"] as const;

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginData = z.infer<typeof loginSchema>;

const usersDB = [
    { email: "official@example.com", password: "password123", role: "official" },
    { email: "tenant@example.com", password: "password123", role: "tenant" },
    { email: "host@example.com", password: "password123", role: "host" },
];

// Step 1: Authenticate user
function authenticateUser(email: string, password: string) {
    return usersDB.find((user) => user.email === email && user.password === password) || null;
}

// Step 2: Fetch user role
function getUserRole(email: string) {
    const user = usersDB.find((user) => user.email === email);
    return user ? user.role : null;
}

// Login function
export async function loginUser(data: LoginData) {
    loginSchema.parse(data); // Validate input before proceeding

    return new Promise<{ success: boolean; role: string }>((resolve, reject) => {
        const timeout = Math.floor(Math.random() * (1200 - 500 + 1)) + 500;

        setTimeout(() => {
            const authenticatedUser = authenticateUser(data.email, data.password);

            if (!authenticatedUser) {
                reject(new Error("Invalid email or password"));
                return;
            }

            const role = getUserRole(data.email);

            if (!role || !roles.includes(role as any)) {
                reject(new Error("Invalid email or password")); // Hide role details for security
                return;
            }

            resolve({ success: true, role });
        }, timeout);
    });
}
