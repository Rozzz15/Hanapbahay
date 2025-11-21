import { db, generateId } from './db';
import { mockSignUp } from './mock-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DbUserRecord, OwnerProfileRecord, PublishedListingRecord, OwnerApplicationRecord } from '../types';
import { BARANGAYS } from '../constants/Barangays';

// Filipino names for owners
const OWNER_NAMES = [
  'Rozel O. Ramos',
  'Maria Santos',
  'Juan Dela Cruz',
  'Ana Garcia',
  'Carlos Mendoza',
  'Liza Fernandez',
  'Roberto Torres',
  'Carmen Reyes',
  'Miguel Villanueva',
  'Patricia Aquino',
];

// Property types and details
const PROPERTY_TYPES = ['apartment', 'house', 'condo', 'room', 'studio'];
const RENTAL_TYPES = ['entire-place', 'private-room', 'shared-room'];
const LEASE_TERMS = ['short-term', 'long-term', 'negotiable'];
const AVAILABILITY_STATUSES = ['available', 'occupied', 'reserved'];
const PAYMENT_METHODS = ['cash', 'bank-transfer', 'gcash', 'paymaya'];
const AMENITIES_OPTIONS = [
  'wifi',
  'air-conditioning',
  'parking',
  'kitchen',
  'washing-machine',
  'refrigerator',
  'water-heater',
  'security',
  'cctv',
  'near-transportation',
];
const RULES_OPTIONS = [
  'no-smoking',
  'no-pets',
  'no-parties',
  'quiet-hours',
  'visitor-policy',
  'maintenance-responsibility',
];

// Generate email from name (format: firstname@gmail.com)
// Use first name only, lowercase
// Add number only when needed for uniqueness (since we have 5 barangays, each name appears 5 times)
function generateEmail(name: string, index: number, barangay: string, barangayIndex: number): string {
  const nameParts = name.split(' ');
  const firstName = nameParts[0]; // Get first name (e.g., "Rozel", "Maria")
  const firstNameLower = firstName.toLowerCase();
  
  // Global index to ensure uniqueness across all barangays (1-50)
  const globalIndex = barangayIndex * 10 + index;
  
  // Since we have 10 unique first names and 5 barangays, each name will appear 5 times
  // Use just firstname@gmail.com for the first occurrence (first barangay)
  // Add number for subsequent occurrences: firstname{number}@gmail.com
  if (barangayIndex === 0) {
    // First barangay: just firstname@gmail.com (e.g., maria@gmail.com)
    return `${firstNameLower}@gmail.com`;
  } else {
    // Other barangays: firstname{globalIndex}@gmail.com (e.g., maria11@gmail.com)
    return `${firstNameLower}${globalIndex}@gmail.com`;
  }
}

// Generate password - all owners use the same password: E@yana05
function generatePassword(name: string, index: number): string {
  // All owners use the same password as requested
  return 'E@yana05';
}

// Generate phone number (format: +63 followed by 10 digits, no spaces - required by validation)
function generatePhoneNumber(index: number): string {
  const areaCode = '910';
  const number = String(1000000 + index).padStart(7, '0');
  // Format: +63 + 10 digits (no spaces) - matches validation regex: /^\+63[0-9]{10}$/
  return `+63${areaCode}${number.substring(0, 3)}${number.substring(3)}`;
}

// Generate property address
function generatePropertyAddress(barangay: string, propertyIndex: number, ownerIndex: number): string {
  const streetNumbers = ['123', '456', '789', '321', '654', '987', '111', '222', '333', '444'];
  const streetNames = ['Main Street', 'Rizal Avenue', 'Magsaysay Road', 'Burgos Street', 'Gomez Avenue'];
  const streetNumber = streetNumbers[(ownerIndex * 2 + propertyIndex) % streetNumbers.length];
  const streetName = streetNames[ownerIndex % streetNames.length];
  return `${streetNumber} ${streetName}, ${barangay}, Dumaguete City`;
}

// Generate random property data
function generatePropertyData(
  ownerId: string,
  ownerName: string,
  ownerEmail: string,
  ownerPhone: string,
  barangay: string,
  propertyIndex: number,
  ownerIndex: number
): PublishedListingRecord {
  const now = new Date().toISOString();
  const propertyType = PROPERTY_TYPES[Math.floor(Math.random() * PROPERTY_TYPES.length)];
  const rentalType = RENTAL_TYPES[Math.floor(Math.random() * RENTAL_TYPES.length)];
  const rooms = Math.floor(Math.random() * 4) + 1; // 1-4 rooms
  const bathrooms = Math.floor(Math.random() * 2) + 1; // 1-2 bathrooms
  const monthlyRent = Math.floor(Math.random() * 15000) + 5000; // 5000-20000
  const securityDeposit = 0; // Security deposit feature removed
  const advanceDepositMonths = Math.random() > 0.5 ? 2 : undefined; // 50% chance of 2 months advance
  
  // Random amenities (3-6 amenities)
  const numAmenities = Math.floor(Math.random() * 4) + 3;
  const shuffledAmenities = [...AMENITIES_OPTIONS].sort(() => Math.random() - 0.5);
  const amenities = shuffledAmenities.slice(0, numAmenities);
  
  // Random rules (2-4 rules)
  const numRules = Math.floor(Math.random() * 3) + 2;
  const shuffledRules = [...RULES_OPTIONS].sort(() => Math.random() - 0.5);
  const rules = shuffledRules.slice(0, numRules);
  
  // Random payment methods (2-3 methods)
  const numPaymentMethods = Math.floor(Math.random() * 2) + 2;
  const shuffledPaymentMethods = [...PAYMENT_METHODS].sort(() => Math.random() - 0.5);
  const paymentMethods = shuffledPaymentMethods.slice(0, numPaymentMethods);
  
  const listingId = generateId('listing');
  const address = generatePropertyAddress(barangay, propertyIndex, ownerIndex);
  // IMPORTANT: Set to 'available' so properties show up in listings
  // Only 'available' properties are shown in the property listing view
  const availabilityStatus = 'available';
  const leaseTerm = LEASE_TERMS[Math.floor(Math.random() * LEASE_TERMS.length)];
  
  return {
    id: listingId,
    userId: ownerId,
    propertyType,
    rentalType,
    address,
    barangay: barangay.toUpperCase(),
    rooms,
    bathrooms,
    monthlyRent,
    amenities,
    rules,
    photos: [],
    videos: [],
    coverPhoto: null,
    securityDeposit,
    advanceDepositMonths,
    paymentMethods,
    ownerName,
    businessName: `${ownerName}'s Properties`,
    contactNumber: ownerPhone,
    email: ownerEmail,
    emergencyContact: ownerPhone,
    availabilityStatus,
    leaseTerm,
    status: 'published',
    publishedAt: now,
    title: `${propertyType} in ${address.split(',')[0]}`,
    location: address.split(',')[0] || 'Location not specified',
    size: Math.floor(Math.random() * 50) + 20, // 20-70 sqm
    price: monthlyRent,
    ownerUserId: ownerId,
    capacity: rentalType === 'entire-place' ? rooms : 1,
    roomCapacities: rentalType === 'entire-place' ? Array(rooms).fill(1) : undefined,
  };
}

// Create owner with properties
async function createOwnerWithProperties(
  name: string,
  email: string,
  password: string,
  phone: string,
  barangay: string,
  index: number
): Promise<{ success: boolean; ownerId?: string; error?: string }> {
  try {
    console.log(`👤 Creating owner ${index + 1} for ${barangay}: ${name} (${email})`);
    
    // Step 1: Create user account via mockSignUp
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`🔐 Creating account for: ${normalizedEmail}`);
    
    const signUpResult = await mockSignUp(normalizedEmail, password, 'owner');
    if (!signUpResult.success || !signUpResult.user) {
      console.error(`❌ mockSignUp failed: ${signUpResult.error}`);
      return {
        success: false,
        error: signUpResult.error || 'Failed to create user account',
      };
    }
    
    const userId = signUpResult.user.id;
    const now = new Date().toISOString();
    
    // Wait a bit to ensure AsyncStorage write completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify user was saved to mock auth
    const MOCK_USERS_KEY = 'mock_users_database';
    const verifyAuth = await AsyncStorage.getItem(MOCK_USERS_KEY);
    if (verifyAuth) {
      const authData = JSON.parse(verifyAuth);
      if (!authData[normalizedEmail]) {
        console.warn(`⚠️ User not in mock auth after signUp, adding manually...`);
        authData[normalizedEmail] = {
          email: normalizedEmail,
          password: password,
          id: userId,
          role: 'owner',
          roles: ['owner'],
          createdAt: now,
        };
        await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(authData));
        console.log(`✅ User manually added to mock auth: ${normalizedEmail}`);
      } else {
        console.log(`✅ User verified in mock auth: ${normalizedEmail}`);
      }
    } else {
      // No users exist, create the storage
      const authData: Record<string, any> = {
        [normalizedEmail]: {
          email: normalizedEmail,
          password: password,
          id: userId,
          role: 'owner',
          roles: ['owner'],
          createdAt: now,
        },
      };
      await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(authData));
      console.log(`✅ Created mock auth storage with user: ${normalizedEmail}`);
    }
    
    // Step 2: Update user record with full details
    const userRecord: DbUserRecord = {
      id: userId,
      email: email.toLowerCase(),
      name,
      phone,
      address: `${barangay} Street, Dumaguete City`,
      role: 'owner',
      roles: ['owner'],
      createdAt: now,
      updatedAt: now,
    };
    await db.upsert('users', userId, userRecord);
    console.log(`✅ User record created: ${userId}`);
    
    // Step 3: Create owner profile
    const ownerProfile: OwnerProfileRecord = {
      userId,
      businessName: `${name}'s Properties`,
      contactNumber: phone,
      email: email.toLowerCase(),
      createdAt: now,
    };
    await db.upsert('owners', userId, ownerProfile);
    await db.upsert('owner_profiles', userId, ownerProfile);
    console.log(`✅ Owner profile created: ${userId}`);
    
    // Step 4: Update mock auth with full user details (ensure password and all fields are correct)
    const MOCK_USERS_KEY = 'mock_users_database';
    const storedUsers = await AsyncStorage.getItem(MOCK_USERS_KEY);
    const normalizedEmail = email.toLowerCase().trim();
    
    if (storedUsers) {
      const usersData = JSON.parse(storedUsers);
      // Always update to ensure password and all fields are correct
      usersData[normalizedEmail] = {
        email: normalizedEmail,
        password: password, // CRITICAL: Ensure password is correct
        id: userId,
        role: 'owner',
        roles: ['owner'],
        name,
        phone,
        address: `${barangay} Street, Dumaguete City`,
        createdAt: now,
        updatedAt: now,
      };
      await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(usersData));
      console.log(`✅ Mock auth updated with all details: ${normalizedEmail}`);
      
      // Verify it was saved
      const verify = await AsyncStorage.getItem(MOCK_USERS_KEY);
      if (verify) {
        const verifyData = JSON.parse(verify);
        if (verifyData[normalizedEmail] && verifyData[normalizedEmail].password === password) {
          console.log(`✅ Verified: User ${normalizedEmail} exists with correct password`);
        } else {
          console.error(`❌ Verification failed: User ${normalizedEmail} not found or wrong password`);
        }
      }
    } else {
      // No users exist yet, create the entry
      const usersData: Record<string, any> = {
        [normalizedEmail]: {
          email: normalizedEmail,
          password: password,
          id: userId,
          role: 'owner',
          roles: ['owner'],
          name,
          phone,
          address: `${barangay} Street, Dumaguete City`,
          createdAt: now,
          updatedAt: now,
        },
      };
      await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(usersData));
      console.log(`✅ Created mock auth entry: ${normalizedEmail}`);
    }
    
    // Step 5: Create approved owner application (REQUIRED for owners to use the app)
    const applicationId = generateId('app');
    const houseNumber = String(Math.floor(Math.random() * 999) + 1); // Random house number 1-999
    const streetNames = ['Main Street', 'Rizal Avenue', 'Magsaysay Road', 'Burgos Street', 'Gomez Avenue'];
    const street = streetNames[index % streetNames.length];
    
    // Get barangay official ID for reviewedBy (if exists)
    const allUsers = await db.list<DbUserRecord>('users');
    const barangayOfficial = allUsers.find(
      user => user.role === 'brgy_official' && user.barangay?.toUpperCase() === barangay.toUpperCase()
    );
    
    const ownerApplication: OwnerApplicationRecord = {
      id: applicationId,
      userId,
      name,
      email: email.toLowerCase(),
      contactNumber: phone,
      houseNumber,
      street,
      barangay: barangay.toUpperCase(),
      govIdUri: null, // No document for seed data
      documents: undefined, // No documents for seed data
      status: 'approved', // IMPORTANT: Set to approved so owners can use the app immediately
      createdBy: userId,
      reviewedBy: barangayOfficial?.id || userId, // Use barangay official if exists, otherwise self
      createdAt: now,
      reviewedAt: now, // Set reviewedAt to now to simulate approval
    };
    
    await db.upsert('owner_applications', applicationId, ownerApplication);
    console.log(`✅ Owner application created and approved: ${applicationId}`);
    
    // Step 6: Create 2 properties for this owner
    // Import clearCollectionCache for use in property creation
    const { clearCollectionCache } = await import('./db');
    
    const properties: PublishedListingRecord[] = [];
    for (let propIndex = 0; propIndex < 2; propIndex++) {
      const property = generatePropertyData(
        userId,
        name,
        email.toLowerCase(),
        phone,
        barangay,
        propIndex,
        index
      );
      // Save property with retry mechanism and verification
      let saveSuccess = false;
      let saveAttempts = 0;
      const maxAttempts = 5; // Increased attempts
      
      while (saveAttempts < maxAttempts && !saveSuccess) {
        try {
          // Clear cache before save to ensure fresh write
          clearCollectionCache('published_listings');
          
          // Save property
          await db.upsert('published_listings', property.id, property);
          
          // Wait longer for AsyncStorage to complete
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Clear cache again before reading
          clearCollectionCache('published_listings');
          
          // Verify property was saved by reading directly from AsyncStorage
          const { KEY_PREFIX } = await import('./db');
          const storageKey = KEY_PREFIX + 'published_listings';
          const rawData = await AsyncStorage.getItem(storageKey);
          
          if (rawData) {
            const data = JSON.parse(rawData);
            if (data[property.id] && data[property.id].id === property.id) {
              // Also verify via db.get
              const verifyProperty = await db.get('published_listings', property.id);
              if (verifyProperty && verifyProperty.id === property.id) {
                saveSuccess = true;
                properties.push(property);
                console.log(`✅ Property ${propIndex + 1} created and verified: ${property.id} - ${property.address}`);
              } else {
                throw new Error('Property not found via db.get');
              }
            } else {
              throw new Error('Property not found in AsyncStorage');
            }
          } else {
            throw new Error('AsyncStorage data is null');
          }
        } catch (error) {
          saveAttempts++;
          console.error(`❌ Save attempt ${saveAttempts}/${maxAttempts} failed for property ${property.id}:`, error);
          if (saveAttempts < maxAttempts) {
            // Wait longer between retries
            await new Promise(resolve => setTimeout(resolve, 300));
          } else {
            console.error(`❌ CRITICAL: Failed to save property ${property.id} after ${maxAttempts} attempts`);
            throw new Error(`Failed to save property ${property.id} after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
      
      if (!saveSuccess) {
        throw new Error(`Failed to save property ${property.id} - all attempts exhausted`);
      }
    }
    
    // Final verification: Check all data was created
    const verifyUser = await db.get('users', userId);
    const verifyOwner = await db.get('owners', userId);
    const verifyApplication = await db.list('owner_applications');
    const ownerApp = verifyApplication.find(app => app.userId === userId);
    const verifyListings = await db.list('published_listings');
    const ownerListings = verifyListings.filter(l => l.userId === userId);
    
    // Verify mock auth one more time
    const finalAuthCheck = await AsyncStorage.getItem(MOCK_USERS_KEY);
    let mockAuthVerified = false;
    if (finalAuthCheck) {
      const authData = JSON.parse(finalAuthCheck);
      mockAuthVerified = !!(authData[normalizedEmail] && authData[normalizedEmail].password === password);
    }
    
    console.log(`\n📊 Verification for ${name}:`);
    console.log(`   User record: ${verifyUser ? '✅' : '❌'}`);
    console.log(`   Owner profile: ${verifyOwner ? '✅' : '❌'}`);
    console.log(`   Application: ${ownerApp ? '✅' : '❌'} (status: ${ownerApp?.status})`);
    console.log(`   Listings: ${ownerListings.length}/2`);
    console.log(`   Mock auth: ${mockAuthVerified ? '✅' : '❌'}`);
    
    if (!verifyUser || !verifyOwner || !ownerApp || ownerListings.length !== 2 || !mockAuthVerified) {
      const missing = [];
      if (!verifyUser) missing.push('user record');
      if (!verifyOwner) missing.push('owner profile');
      if (!ownerApp) missing.push('application');
      if (ownerListings.length !== 2) missing.push(`listings (found ${ownerListings.length})`);
      if (!mockAuthVerified) missing.push('mock auth');
      console.error(`❌ Missing data: ${missing.join(', ')}`);
      
      // Try to fix mock auth one more time
      if (!mockAuthVerified) {
        console.log(`🔧 Attempting to fix mock auth for ${normalizedEmail}...`);
        const authData = finalAuthCheck ? JSON.parse(finalAuthCheck) : {};
        authData[normalizedEmail] = {
          email: normalizedEmail,
          password: password,
          id: userId,
          role: 'owner',
          roles: ['owner'],
          name,
          phone,
          address: `${barangay} Street, Dumaguete City`,
          createdAt: now,
          updatedAt: now,
        };
        await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(authData));
        console.log(`✅ Fixed mock auth for ${normalizedEmail}`);
      }
    }
    
    return {
      success: true,
      ownerId: userId,
    };
  } catch (error) {
    console.error(`❌ Error creating owner ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Main seed function
export async function seedDefaultOwners(): Promise<{
  success: boolean;
  totalOwners: number;
  totalProperties: number;
  owners: Array<{ name: string; email: string; password: string; barangay: string }>;
  errors: string[];
}> {
  console.log('🌱 Starting seed process for default owners...');
  const owners: Array<{ name: string; email: string; password: string; barangay: string }> = [];
  const errors: string[] = [];
  let totalOwners = 0;
  let totalProperties = 0;
  
  try {
    // Process each barangay
    for (let barangayIndex = 0; barangayIndex < BARANGAYS.length; barangayIndex++) {
      const barangay = BARANGAYS[barangayIndex];
      console.log(`\n📍 Processing barangay: ${barangay}`);
      
      // Create 10 owners for this barangay
      for (let i = 0; i < 10; i++) {
        const name = OWNER_NAMES[i];
        const email = generateEmail(name, i + 1, barangay, barangayIndex);
        const password = generatePassword(name, i + 1);
        const phone = generatePhoneNumber(barangayIndex * 10 + i + 1);
        
        const result = await createOwnerWithProperties(name, email, password, phone, barangay, i);
        
        if (result.success) {
          totalOwners++;
          totalProperties += 2; // Each owner has 2 properties
          owners.push({ name, email, password, barangay });
          console.log(`✅ Owner ${i + 1}/10 created for ${barangay}`);
        } else {
          errors.push(`${barangay} - ${name} (${email}): ${result.error}`);
          console.error(`❌ Failed to create owner ${i + 1}/10 for ${barangay}: ${result.error}`);
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n📊 Seed Summary:');
    console.log(`   Total Owners Created: ${totalOwners}/${BARANGAYS.length * 10}`);
    console.log(`   Total Properties Created: ${totalProperties}`);
    console.log(`   Errors: ${errors.length}`);
    
    // Final verification
    console.log('\n🔍 Final Verification...');
    const allUsers = await db.list('users');
    const allOwners = allUsers.filter(u => u.role === 'owner');
    const allListings = await db.list('published_listings');
    const allApplications = await db.list('owner_applications');
    const approvedApps = allApplications.filter(a => a.status === 'approved');
    
    console.log(`   Users in database: ${allUsers.length}`);
    console.log(`   Owner users: ${allOwners.length}`);
    console.log(`   Published listings: ${allListings.length}`);
    console.log(`   Approved applications: ${approvedApps.length}`);
    
    // Check mock auth and verify all owners are there
    const MOCK_USERS_KEY = 'mock_users_database';
    const mockAuthData = await AsyncStorage.getItem(MOCK_USERS_KEY);
    const mockAuthUsers = mockAuthData ? Object.keys(JSON.parse(mockAuthData)).length : 0;
    console.log(`   Users in mock auth: ${mockAuthUsers}`);
    
    // Verify each owner can be found in mock auth
    if (mockAuthData && owners.length > 0) {
      const authData = JSON.parse(mockAuthData);
      let missingInAuth = 0;
      owners.forEach(owner => {
        const normalizedEmail = owner.email.toLowerCase().trim();
        if (!authData[normalizedEmail]) {
          console.warn(`⚠️ Owner ${owner.email} not found in mock auth, adding...`);
          missingInAuth++;
          // Add missing owner
          const ownerUser = allOwners.find(u => u.email.toLowerCase() === normalizedEmail);
          if (ownerUser) {
            authData[normalizedEmail] = {
              email: normalizedEmail,
              password: owner.password,
              id: ownerUser.id,
              role: 'owner',
              roles: ['owner'],
              name: owner.name,
              createdAt: ownerUser.createdAt,
              updatedAt: new Date().toISOString(),
            };
          }
        }
      });
      if (missingInAuth > 0) {
        await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(authData));
        console.log(`✅ Added ${missingInAuth} missing owners to mock auth`);
      }
    }
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Warn if data doesn't match
    if (totalOwners !== allOwners.length) {
      console.warn(`⚠️ Warning: Created ${totalOwners} owners but found ${allOwners.length} in database`);
    }
    if (totalProperties !== allListings.length) {
      console.warn(`⚠️ Warning: Created ${totalProperties} properties but found ${allListings.length} in database`);
    }
    
    // Final mock auth count after fixes
    const finalAuthData = await AsyncStorage.getItem(MOCK_USERS_KEY);
    const finalAuthUsers = finalAuthData ? Object.keys(JSON.parse(finalAuthData)).length : 0;
    if (totalOwners !== finalAuthUsers) {
      console.warn(`⚠️ Warning: Created ${totalOwners} owners but found ${finalAuthUsers} in mock auth`);
    } else {
      console.log(`✅ All ${totalOwners} owners are in mock auth!`);
    }
    
    return {
      success: errors.length === 0,
      totalOwners,
      totalProperties,
      owners,
      errors,
    };
  } catch (error) {
    console.error('❌ Fatal error during seed process:', error);
    return {
      success: false,
      totalOwners,
      totalProperties,
      owners,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown fatal error'],
    };
  }
}

// Export owner credentials for reference
export function getOwnerCredentials(): Array<{
  name: string;
  email: string;
  password: string;
  barangay: string;
}> {
  const credentials: Array<{ name: string; email: string; password: string; barangay: string }> = [];
  
  for (let barangayIndex = 0; barangayIndex < BARANGAYS.length; barangayIndex++) {
    const barangay = BARANGAYS[barangayIndex];
    for (let i = 0; i < 10; i++) {
      const name = OWNER_NAMES[i];
      const email = generateEmail(name, i + 1, barangay, barangayIndex);
      const password = generatePassword(name, i + 1);
      credentials.push({ name, email, password, barangay });
    }
  }
  
  return credentials;
}

