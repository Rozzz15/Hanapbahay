import { z } from "zod";
import { mockSignUp } from '../../utils/mock-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, generateId } from '@/utils/db';
import { DbUserRecord, TenantProfileRecord, ListingDraftRecord, OwnerProfileRecord, OwnerVerificationRecord, PaymentProfileRecord } from '@/types';

// Allow role selection: tenant or owner
export const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    contactNumber: z.string()
        .length(13, "Contact number must be exactly 10 digits")
        .regex(/^\+63[0-9]{10}$/, "Contact number must be exactly 10 digits after +63"),
    address: z.string().optional().or(z.literal('')),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    role: z.enum(['tenant', 'owner']).default('tenant'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
});

export type SignUpData = z.infer<typeof signUpSchema>;

// Sign-up function using mock authentication
export async function signUpUser(data: SignUpData) {
    try {
        signUpSchema.parse(data); // Validate input before proceeding
        const result = await mockSignUp(data.email, data.password, data.role);

        if (!result.success) {
            throw new Error(result.error || "Failed to create account");
        }

        // Store personal details from sign-up form
        const personalDetails = {
            firstName: data.name.split(' ')[0] || '',
            lastName: data.name.split(' ').slice(1).join(' ') || '',
            email: data.email,
            phone: data.contactNumber,
            address: data.address,
            profilePhoto: null
        };

        // Write to local DB (organized collections)
        const now = new Date().toISOString();
        const userRecord: DbUserRecord = {
            id: result.user?.id || generateId('user'),
            email: data.email,
            name: data.name,
            phone: data.contactNumber,
            address: data.address,
            role: data.role,
            createdAt: now,
        };
        await db.upsert('users', userRecord.id, userRecord);

        // Save personal details to AsyncStorage scoped per user
        const newUserId = userRecord.id;
        const perUserPersonalKey = `personal_details:${newUserId}`;
        await AsyncStorage.setItem(perUserPersonalKey, JSON.stringify(personalDetails));
        console.log('Personal details saved from sign-up (per user):', perUserPersonalKey, personalDetails);

        if (data.role === 'owner') {
            // Create owner profile
            const ownerProfile: OwnerProfileRecord = {
                userId: userRecord.id,
                businessName: data.name,
                contactNumber: data.contactNumber,
                email: data.email,
                createdAt: now,
            };
            await db.upsert('owners', userRecord.id, ownerProfile);
            await db.upsert('owner_profiles', userRecord.id, ownerProfile);

            // Load owner extras persisted by the sign-up screen
            const verificationRaw = await AsyncStorage.getItem('owner_verification');
            const paymentRaw = await AsyncStorage.getItem('owner_payment');

            const verification = verificationRaw ? JSON.parse(verificationRaw) : null;
            const payment = paymentRaw ? JSON.parse(paymentRaw) : null;

            if (verification?.govIdUri) {
                const ownerVerification: OwnerVerificationRecord = {
                    userId: userRecord.id,
                    govIdUri: verification.govIdUri,
                    status: 'pending',
                    createdAt: now,
                };
                await db.upsert('owner_verifications', userRecord.id, ownerVerification);
            }

            if (payment) {
                const paymentProfile: PaymentProfileRecord = {
                    userId: userRecord.id,
                    methods: payment.paymentMethods || [],
                    createdAt: now,
                };
                await db.upsert('payment_profiles', userRecord.id, paymentProfile);
            }
        } else {
            // Create tenant profile
            const tenantProfile: TenantProfileRecord = {
                userId: userRecord.id,
                firstName: data.name.split(' ')[0] || '',
                lastName: data.name.split(' ').slice(1).join(' ') || '',
                contactNumber: data.contactNumber,
                email: data.email,
                address: data.address,
                preferences: {
                    budget: { min: 0, max: 100000 },
                    location: [],
                    amenities: []
                },
                createdAt: now,
            };
            await db.upsert('tenants', userRecord.id, tenantProfile);
        }

        return { 
            success: true, 
            role: data.role,
            user: result.user
        };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        throw new Error(message);
    }
}
