import { z } from "zod";
import { mockSignUp, testAsyncStorage } from '../../utils/mock-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, generateId } from '@/utils/db';
import { DbUserRecord, TenantProfileRecord, OwnerProfileRecord, OwnerVerificationRecord, OwnerApplicationRecord, BrgyNotificationRecord } from '@/types';

// Allow role selection: tenant or owner
export const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    contactNumber: z.string()
        .length(13, "Contact number must be exactly 13 characters with +63 prefix")
        .regex(/^\+63[0-9]{10}$/, "Contact number must be exactly 10 digits after +63"),
    address: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    role: z.enum(['tenant', 'owner']).default('tenant'),
    gender: z.enum(['male', 'female']).optional(),
    familyType: z.enum(['individual', 'family']).optional(),
    emergencyContactPerson: z.string().optional(),
    emergencyContactNumber: z.string().optional(),
    // Owner-specific fields
    houseNumber: z.string().optional(),
    street: z.string().optional(),
    barangay: z.enum(['RIZAL', 'TALOLONG', 'GOMEZ', 'MAGSAYSAY']).optional(),
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
            gender: data.gender,
            familyType: data.familyType,
            emergencyContactPerson: data.emergencyContactPerson || '',
            emergencyContactNumber: data.emergencyContactNumber || '',
            profilePhoto: null
        };

        // Write to local DB (organized collections)
        const now = new Date().toISOString();
        const userRecord: DbUserRecord = {
            id: result.user?.id || generateId('user'),
            email: data.email,
            name: data.name,
            phone: data.contactNumber,
            address: data.address || '',
            role: data.role,
            roles: [data.role], // Add roles array for AuthContext compatibility
            gender: data.gender, // Save gender for analytics
            familyType: data.familyType,
            createdAt: now,
            updatedAt: now, // Track when user was last updated
        };
        console.log('💾 Saving user record to database:', userRecord);
        console.log('💾 Gender saved:', userRecord.gender ? `✅ ${userRecord.gender}` : '⚠️ No gender provided');
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

            // Load owner documents persisted by the sign-up screen
            console.log('🔍 Checking for owner verification documents...');
            const verificationRaw = await AsyncStorage.getItem('owner_verification');

            const verification = verificationRaw ? JSON.parse(verificationRaw) : null;
            console.log('📋 Verification data:', verification);

            // Extract documents from verification data
            const documents = verification?.documents || [];
            
            // For backward compatibility, also check for govIdUri
            let govIdUri: string | null = null;
            if (verification?.govIdUri) {
                govIdUri = verification.govIdUri;
            } else if (documents.length > 0) {
                // If no govIdUri but documents exist, use first document's URI for backward compatibility
                const govIdDoc = documents.find((doc: any) => doc.name === 'Government ID');
                if (govIdDoc) {
                    govIdUri = govIdDoc.uri;
                }
            }

            if (documents.length > 0 || govIdUri) {
                console.log('📄 Creating owner verification record...');
                const ownerVerification: OwnerVerificationRecord = {
                    userId: userRecord.id,
                    govIdUri: govIdUri || documents[0]?.uri || '',
                    status: 'pending',
                    createdAt: now,
                };
                await db.upsert('owner_verifications', userRecord.id, ownerVerification);
                console.log('✅ Owner verification record created');
            } else {
                console.log('ℹ️ No documents provided, skipping verification record');
            }

            // Create owner application if barangay is specified
            if (data.barangay) {
                console.log('📝 Creating owner application for barangay:', data.barangay);
                
                const applicationId = generateId('app');
                const ownerApplication: OwnerApplicationRecord = {
                    id: applicationId,
                    userId: userRecord.id,
                    name: data.name,
                    email: data.email,
                    contactNumber: data.contactNumber,
                    houseNumber: data.houseNumber || '',
                    street: data.street || '',
                    barangay: data.barangay,
                    govIdUri: govIdUri, // Keep for backward compatibility
                    documents: documents.length > 0 ? documents : undefined, // New field for multiple documents
                    status: 'pending',
                    createdBy: userRecord.id,
                    createdAt: now,
                };

                try {
                    await db.upsert('owner_applications', applicationId, ownerApplication);
                    console.log('✅ Owner application created');

                    // Create notification for barangay officials
                    const notificationId = generateId('brgy_notif');
                    const brgyNotification: BrgyNotificationRecord = {
                        id: notificationId,
                        barangay: data.barangay,
                        type: 'owner_application',
                        ownerApplicationId: applicationId,
                        ownerName: data.name,
                        isRead: false,
                        createdAt: now,
                    };

                    try {
                        await db.upsert('brgy_notifications', notificationId, brgyNotification);
                        console.log('✅ Barangay notification created');
                    } catch (notifError) {
                        console.error('❌ Failed to create notification:', notifError);
                    }
                } catch (appError) {
                    console.error('❌ Failed to create owner application:', appError);
                }
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
                gender: data.gender,
                familyType: data.familyType,
                emergencyContactPerson: data.emergencyContactPerson,
                emergencyContactNumber: data.emergencyContactNumber,
                preferences: {
                    budget: { min: 0, max: 100000 },
                    location: [],
                    amenities: []
                },
                createdAt: now,
            };
            await db.upsert('tenants', userRecord.id, tenantProfile);
            console.log('✅ Tenant profile saved with gender:', tenantProfile.gender ? `✅ ${tenantProfile.gender}` : '⚠️ No gender provided');
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
