import { z } from "zod";
import { mockSignUp, testAsyncStorage } from '../../utils/mock-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, generateId } from '@/utils/db';
import { DbUserRecord, TenantProfileRecord, OwnerProfileRecord, OwnerVerificationRecord } from '@/types';

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
        console.log('🔐 Starting sign-up process for:', data.email, 'role:', data.role);
        
        // Test AsyncStorage functionality first
        console.log('🧪 Testing AsyncStorage functionality...');
        const storageTest = await testAsyncStorage();
        if (!storageTest) {
            throw new Error('AsyncStorage is not working properly');
        }
        console.log('✅ AsyncStorage test passed');
        
        signUpSchema.parse(data); // Validate input before proceeding
        console.log('✅ Schema validation passed');
        const result = await mockSignUp(data.email, data.password, data.role);
        console.log('📊 Mock sign-up result:', result);

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
        const userRecord: any = {
            id: result.user?.id || generateId('user'),
            email: data.email,
            name: data.name,
            phone: data.contactNumber,
            address: data.address || '',
            role: data.role,
            roles: [data.role], // Add roles array for AuthContext compatibility
            createdAt: now,
        };
        console.log('💾 Saving user record to database:', userRecord);
        try {
          await db.upsert('users', userRecord.id, userRecord);
          console.log('✅ User record saved successfully');
        } catch (dbError) {
          console.error('❌ Failed to save user record:', dbError);
          throw new Error('Failed to save user to database');
        }

        // Save personal details to AsyncStorage scoped per user
        const newUserId = userRecord.id;
        const perUserPersonalKey = `personal_details:${newUserId}`;
        await AsyncStorage.setItem(perUserPersonalKey, JSON.stringify(personalDetails));
        console.log('Personal details saved from sign-up (per user):', perUserPersonalKey, personalDetails);

        if (data.role === 'owner') {
            console.log('👤 Creating owner profile for:', userRecord.id);
            // Create owner profile
            const ownerProfile: OwnerProfileRecord = {
                userId: userRecord.id,
                businessName: data.name,
                contactNumber: data.contactNumber,
                email: data.email,
                createdAt: now,
            };
            console.log('💾 Saving owner profile to owners collection...');
            try {
              await db.upsert('owners', userRecord.id, ownerProfile);
              console.log('✅ Owner profile saved to owners collection');
            } catch (dbError) {
              console.error('❌ Failed to save owner profile to owners collection:', dbError);
              throw new Error('Failed to save owner profile');
            }
            
            console.log('💾 Saving owner profile to owner_profiles collection...');
            try {
              await db.upsert('owner_profiles', userRecord.id, ownerProfile);
              console.log('✅ Owner profile saved to owner_profiles collection');
            } catch (dbError) {
              console.error('❌ Failed to save owner profile to owner_profiles collection:', dbError);
              throw new Error('Failed to save owner profile');
            }
            
            console.log('✅ Owner profile created successfully');

            // Load owner extras persisted by the sign-up screen
            console.log('🔍 Checking for owner verification data...');
            const verificationRaw = await AsyncStorage.getItem('owner_verification');

            const verification = verificationRaw ? JSON.parse(verificationRaw) : null;
            console.log('📋 Verification data:', verification);

            if (verification?.govIdUri) {
                console.log('📄 Creating owner verification record...');
                const ownerVerification: OwnerVerificationRecord = {
                    userId: userRecord.id,
                    govIdUri: verification.govIdUri,
                    status: 'pending',
                    createdAt: now,
                };
                await db.upsert('owner_verifications', userRecord.id, ownerVerification);
                console.log('✅ Owner verification record created');
            } else {
                console.log('ℹ️ No government ID provided, skipping verification record');
            }
        } else {
            // Create tenant profile
            const tenantProfile: TenantProfileRecord = {
                userId: userRecord.id,
                firstName: data.name.split(' ')[0] || '',
                lastName: data.name.split(' ').slice(1).join(' ') || '',
                contactNumber: data.contactNumber,
                email: data.email,
                address: data.address || '',
                preferences: {
                    budget: { min: 0, max: 100000 },
                    location: [],
                    amenities: []
                },
                createdAt: now,
            };
            await db.upsert('tenants', userRecord.id, tenantProfile);
        }

        console.log('🎉 Sign-up completed successfully for:', data.email);
        return { 
            success: true, 
            role: data.role,
            user: result.user,
            error: undefined
        };

    } catch (error) {
        console.error('❌ Sign-up error:', error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        console.error('❌ Error message:', message);
        return {
            success: false,
            role: data.role,
            user: undefined,
            error: message
        };
    }
}
