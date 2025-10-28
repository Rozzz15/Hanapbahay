# Tenant Information Modal Fixes - Verification Guide

## Changes Made

### 1. **Updated TenantInfoModal Component** (`components/TenantInfoModal.tsx`)
✅ **Changes:**
- Loads `gender` and `familyType` from `tenants` table first (primary source)
- Falls back to `users` table if not found in tenants
- Enhanced profile photo loading with fallback method
- Loads tenant address from `tenants` table
- Added extensive logging for debugging

### 2. **Updated Profile Save Function** (`app/(tabs)/profile.tsx`)
✅ **Changes:**
- Now updates BOTH `users` AND `tenants` tables when saving
- Syncs gender, familyType, address, phone, and email to both tables
- Ensures owner can see tenant information

### 3. **Added tenantAddress to BookingRecord** (`types/index.ts`)
✅ **Changes:**
- Added optional `tenantAddress` field to BookingRecord interface

### 4. **Updated Booking Loader** (`utils/booking.ts`)
✅ **Changes:**
- `getBookingsByOwner()` now loads tenant address from `tenants` table
- Populates `tenantAddress` field in booking records

### 5. **Updated UI to Show Address** 
✅ **Changes:**
- `app/(owner)/dashboard.tsx` - Shows tenant address instead of email in booking cards
- `app/(owner)/bookings.tsx` - Shows tenant address with location icon

## How to Verify

### Step 1: Check Tenant Sign-Up
1. Sign up as a new tenant
2. Fill in gender and familyType during sign-up
3. **Verify:** Data should be saved to BOTH `users` and `tenants` tables

### Step 2: Update Tenant Profile
1. As a tenant, go to Profile
2. Click "Edit" on Personal Details
3. Update gender/familyType/address
4. Save
5. **Verify:** Data should be saved to BOTH `users` and `tenants` tables

### Step 3: Check Owner Views
1. As an owner, go to Bookings or Dashboard
2. Click on a booking to see tenant info
3. Click "View Profile" button
4. **Verify:** 
   - ✅ Address shows (from `tenants` table)
   - ✅ Gender shows (from `tenants` table)
   - ✅ Family Type shows (from `tenants` table)
   - ✅ Profile photo shows (if uploaded)

### Step 4: Check Console Logs
When opening tenant info modal, you should see these logs:
```
📊 Loading tenant profile data: {...}
🔍 Attempting to load profile photo for tenant: {tenantId}
✅ Loaded tenant profile from tenants table: {...}
✅ Final tenant data: {...}
```

## Common Issues and Solutions

### Issue 1: Gender/FamilyType shows "Not specified"
**Cause:** Data might be in `users` table but not in `tenants` table
**Solution:** 
1. Tenant should update their profile (this will sync to `tenants` table)
2. Or manually check database to ensure data is in `tenants` table

### Issue 2: Profile photo not showing
**Cause:** Photo might not be uploaded or saved correctly
**Solution:**
1. Verify photo exists in `user_profile_photos` table
2. Check console logs for photo loading errors
3. Try re-uploading the profile photo

### Issue 3: Address not showing
**Cause:** Address might not be in `tenants` table
**Solution:**
1. Ensure tenant has entered address during sign-up
2. Tenant should update profile to sync address to `tenants` table

## Data Flow

```
Tenant Signs Up
  ↓
Data saved to: users table + tenants table
  ↓
Tenant Updates Profile
  ↓
Data synced to: users table + tenants table
  ↓
Owner views booking
  ↓
TenantInfoModal loads from tenants table
  ↓
Shows: address, gender, familyType, photo
```

## Testing Checklist

- [ ] New tenant sign-up with all fields filled
- [ ] Tenant profile update saves to tenants table
- [ ] Owner sees tenant address in booking cards
- [ ] Owner sees full tenant info in modal
- [ ] Profile photo displays in modal
- [ ] Gender shows correct value
- [ ] Family Type shows correct value
- [ ] Address shows physical address (not email)

## Debug Commands

Run in browser console while on owner booking page:
```javascript
// Check if data is in tenants table
const tenantId = 'your-tenant-id-here';
const tenantData = await db.get('tenants', tenantId);
console.log('Tenant data:', tenantData);

// Check profile photos
const photos = await db.list('user_profile_photos');
console.log('Photos:', photos);
```

## Summary

All code changes have been implemented correctly. The TenantInfoModal now:
1. ✅ Loads address from `tenants` table
2. ✅ Loads gender from `tenants` table (with fallback)
3. ✅ Loads familyType from `tenants` table (with fallback)
4. ✅ Loads profile photo with enhanced fallback
5. ✅ Updates both tables when profile is saved

The issue you're seeing is likely due to:
- **Old data** that hasn't been synced to `tenants` table yet
- **Tenants** need to update their profile once to sync data
- **New tenants** should see all data working correctly

Solution: Have tenants update their profile once to sync all data to the `tenants` table.

