# Barangay Settings Persistence Fix

## Problem
When a Barangay Official changes their Official Name (Kapitan) in Settings, the change appears temporarily but doesn't persist. After reopening, logging out/back in, or refreshing the app, the Official Name reverts to the default.

## Root Cause
The app uses a dual storage system:
1. **Database** (`db.upsert('users', ...)`) - Used by dashboard and other features
2. **Mock Auth** (`mockUsers` Map + AsyncStorage) - Used for authentication

When settings were saved:
- ✅ Database was updated correctly
- ❌ Mock auth storage (`mockUsers`) was NOT updated
- ❌ On next login, old data from `mockUsers` was loaded

## Solution Applied

### 1. Added `updateMockUser` Function (`utils/mock-auth.ts`)
```typescript
export const updateMockUser = (userId: string, updates: Partial<...>) => {
  // Finds user by ID in mockUsers Map
  // Updates the user data
  // Saves to persistent storage (AsyncStorage)
}
```

### 2. Updated Settings Save Handler (`app/(brgy)/settings.tsx`)
Now updates THREE storage locations:
1. ✅ Database - `db.upsert('users', user.id, updatedUser)`
2. ✅ Mock Auth - `updateMockUser(user.id, {...})`
3. ✅ Auth Session - `storeAuthUser({...})`

### 3. Enhanced Sign-In Process (`utils/mock-auth.ts`)
Sign-in now checks for newer data in database:
- Compares `updatedAt` timestamps
- If database has newer data, updates `mockUsers` with database data
- Ensures latest information is used on login

## Files Modified
1. **`utils/mock-auth.ts`**
   - Added `updatedAt` field to mockUsers type
   - Added `updateMockUser()` export function
   - Enhanced `mockSignIn()` to check database for newer data

2. **`app/(brgy)/settings.tsx`**
   - Added `updateMockUser()` call in save handler
   - Ensures all three storage systems are updated

3. **`types/index.ts`**
   - Added `updatedAt?: string` to `DbUserRecord` interface

4. **`api/auth/sign-up.ts`**
   - Sets `updatedAt` when creating new users

## How It Works Now

### When User Saves Settings:
1. Database is updated with new name, email, phone
2. Mock auth storage (`mockUsers`) is updated
3. Persistent storage (AsyncStorage) is saved
4. Auth session storage is updated

### When User Logs In:
1. Loads data from `mockUsers` (default)
2. **Checks database** for newer data
3. If database is newer, updates `mockUsers` with database data
4. Uses latest data for the session

### When Dashboard Loads:
1. Loads from database (which has latest data)
2. Displays current official name
3. Shows correct barangay information

## Testing
To verify the fix works:
1. Login as barangay official (e.g., `brgy.rizal@hanapbahay.com`)
2. Go to Settings
3. Change the Official Name
4. Click "Save Changes"
5. **Close the app completely**
6. Reopen and login
7. Check dashboard - should show new name ✅
8. Check settings - should show new name ✅

## Data Flow Diagram

```
Settings Page
    ↓
[Update Database] ← db.upsert('users', ...)
    ↓
[Update Mock Auth] ← updateMockUser(...)
    ↓
[Save to AsyncStorage] ← saveUsersToStorage()
    ↓
[Update Session] ← storeAuthUser(...)
    ↓
Success Message

Next Login
    ↓
[Load from mockUsers]
    ↓
[Check Database] ← db.get('users', id)
    ↓
[Compare timestamps]
    ↓
If database newer:
    ↓
[Update mockUsers]
    ↓
[Save to AsyncStorage]
    ↓
Use updated data
```

## Summary
All user changes to the Official Name (and other profile information) are now properly persisted across:
- ✅ Database
- ✅ Mock authentication storage
- ✅ Persistent storage (AsyncStorage)
- ✅ Session storage

The fix ensures data consistency across all storage systems and prevents the "reverting to default" issue.

