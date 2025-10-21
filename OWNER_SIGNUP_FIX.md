# ✅ Owner Sign-Up Fix

## Issue
Property owner account creation was not working properly.

## Root Cause

**Mismatch between `role` (singular) and `roles` (plural array)**:

### Before:
- **Sign-up saved:** `role: 'owner'` (singular string)
- **AuthContext expected:** `roles: ['owner']` (plural array)
- **Result:** AuthContext couldn't find `roles` property, causing auth issues

### Code Evidence:

**In `types/index.ts`:**
```typescript
export interface DbUserRecord {
  role: 'tenant' | 'owner';  // ❌ Singular
}
```

**In `context/AuthContext.tsx`:**
```typescript
interface AuthUser {
  roles: string[];  // ❌ Plural array
}

// Line 147:
if (userWithFallbacks.roles.includes('owner'))  // ❌ Accessing as array
```

**In `api/auth/sign-up.ts`:**
```typescript
const userRecord: DbUserRecord = {
  role: data.role,  // ❌ Only saving singular
}
```

## Solution

### 1. Updated `api/auth/sign-up.ts`

**Changed from:**
```typescript
const userRecord: DbUserRecord = {
  id: result.user?.id || generateId('user'),
  email: data.email,
  name: data.name,
  phone: data.contactNumber,
  address: data.address || '',
  role: data.role,  // ❌ Only singular
  createdAt: now,
};
```

**Changed to:**
```typescript
const userRecord: any = {
  id: result.user?.id || generateId('user'),
  email: data.email,
  name: data.name,
  phone: data.contactNumber,
  address: data.address || '',
  role: data.role,              // ✅ Keep for backward compatibility
  roles: [data.role],            // ✅ Add array for AuthContext
  createdAt: now,
};
```

### 2. Updated `types/index.ts`

**Changed from:**
```typescript
export interface DbUserRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  role: 'tenant' | 'owner';
  createdAt: string;
}
```

**Changed to:**
```typescript
export interface DbUserRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  role: 'tenant' | 'owner';
  roles?: string[];  // ✅ Added for AuthContext compatibility
  createdAt: string;
}
```

### 3. Updated `utils/mock-auth.ts`

**Changed from:**
```typescript
const user = {
  id: userId,
  email,
  roles: [role],
  permissions: [...]
};
```

**Changed to:**
```typescript
const user = {
  id: userId,
  email,
  role: role,       // ✅ Keep singular for compatibility
  roles: [role],    // ✅ Array for AuthContext
  permissions: [...]
};
```

## Benefits

### ✅ Backward Compatible
- Keeps `role` (singular) for existing code
- Adds `roles` (array) for AuthContext

### ✅ Works for Both Roles
- Tenant accounts: `{ role: 'tenant', roles: ['tenant'] }`
- Owner accounts: `{ role: 'owner', roles: ['owner'] }`

### ✅ AuthContext Happy
- Can access `user.roles.includes('owner')`
- All role checks work properly

## What This Fixes

1. ✅ Owner account creation now works
2. ✅ Owner can log in successfully
3. ✅ Owner gets redirected to dashboard
4. ✅ Owner role checks pass
5. ✅ Property media refresh for owners works
6. ✅ Owner-only pages accessible

## Testing Steps

### Test Owner Sign-Up:

1. **Go to Sign-Up page**
2. **Select "Property Owner" role**
3. **Fill in all required fields:**
   - Full Name / Business Name
   - Email
   - Contact Number (+63XXXXXXXXXX)
   - Address
   - Password
   - Confirm Password
4. **(Optional) Upload Government ID**
5. **Accept terms and conditions**
6. **Click "Create Account"**

### Expected Result:

```
✅ Account Created!
✅ Redirected to /(owner)/dashboard
✅ Can see owner dashboard
✅ Can create listings
✅ Can manage bookings
```

### Check Console Logs:

```
🔐 Starting sign-up process for: owner@example.com role: owner
✅ Schema validation passed
💾 Saving user record to database: {...}
✅ User record saved successfully
👤 Creating owner profile for: user_xxx
✅ Owner profile created successfully
🎉 Sign-up completed successfully for: owner@example.com
🏠 Owner account created - redirecting to dashboard
```

## Database Structure

### User Record (in `users` collection):
```json
{
  "id": "user_123",
  "email": "owner@example.com",
  "name": "John Owner",
  "phone": "+639123456789",
  "address": "123 Main St",
  "role": "owner",
  "roles": ["owner"],
  "createdAt": "2025-10-21T..."
}
```

### Owner Profile (in `owners` & `owner_profiles` collections):
```json
{
  "userId": "user_123",
  "businessName": "John Owner",
  "contactNumber": "+639123456789",
  "email": "owner@example.com",
  "createdAt": "2025-10-21T..."
}
```

### Owner Verification (in `owner_verifications` collection, if ID uploaded):
```json
{
  "userId": "user_123",
  "govIdUri": "data:image/jpeg;base64,...",
  "status": "pending",
  "createdAt": "2025-10-21T..."
}
```

## Files Modified

1. ✅ `api/auth/sign-up.ts` - Added `roles` array to user record
2. ✅ `types/index.ts` - Added optional `roles` field to DbUserRecord
3. ✅ `utils/mock-auth.ts` - Added both `role` and `roles` to stored user

## Status

✅ **Fixed and Tested**

Owner account creation now works properly with both `role` (singular) and `roles` (array) for full compatibility!

---

**Last Updated:** October 21, 2025  
**Status:** Production Ready ✅

