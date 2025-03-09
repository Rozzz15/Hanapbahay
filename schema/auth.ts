import { z } from 'zod';
import mailchecker from 'mailchecker';

export const loginSchema = z.object({
    email: z.string()
        .email({ message: "Invalid email format" })
        .min(5, { message: "Email must be at least 5 characters" })
        .max(50, { message: "Email must not exceed 50 characters" })
        .refine((email) => !mailchecker.isValid(email), {
            message: "Disposable email addresses are not allowed",
        }),

    password: z.string()
        .min(8, { message: "Password must be at least 8 characters" })
        .max(25, { message: "Password must not exceed 25 characters" }),
});
