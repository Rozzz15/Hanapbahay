# Media Persistence Test Guide

This guide will help you test and verify that photos and videos in your HanapBahay app are properly stored in the database and persist across login/logout and app refreshes.

## 🎯 What This Test Verifies

The test checks that:
1. ✅ Media is saved to database when owner creates a listing
2. ✅ Media persists in both `published_listings` and `property_photos`/`property_videos` tables
3. ✅ Media is visible in owner's listings page
4. ✅ Media is visible in tenant dashboard
5. ✅ Media persists after app refresh (reload page)
6. ✅ Media persists after login/logout
7. ✅ Media is properly synced between database tables
8. ✅ Media data is stored correctly (base64 or URI format)

## 📋 Prerequisites

Before running the test, you need:
1. At least one owner account created
2. At least one listing created with photos/videos
3. Node.js installed on your system

## 🚀 How to Run the Test

### Method 1: Using Browser Console (Recommended)

1. **Open your app in the browser** (web version)
   ```bash
   npm run web
   ```

2. **Open browser DevTools**
   - Press `F12` or right-click and select "Inspect"
   - Go to the "Console" tab

3. **Run the test**
   ```javascript
   // Import and run the test
   import { testMediaPersistence } from './utils/test-media-persistence';
   testMediaPersistence();
   ```

   Or if the function is already available:
   ```javascript
   window.testMediaPersistence();
   ```

### Method 2: Using Test Button in App

I've created a test button component you can add to your app (see below).

### Method 3: Using React Native Debugger

1. Open React Native Debugger
2. Go to Console tab
3. Run: `testMediaPersistence()`

## 📊 Understanding Test Results

The test will output:
- **Green ✅**: Test passed successfully
- **Yellow ⚠️**: Warning - something needs attention but not critical
- **Red ❌**: Test failed - this needs to be fixed

### Sample Output

```
================================================================================
  MEDIA PERSISTENCE TEST - STARTED
================================================================================

📋 STEP 1: Checking Database Structure
--------------------------------------------------------------------------------
ℹ️  Found 3 published listings
ℹ️  Found 8 property photos
ℹ️  Found 2 property videos
✅ Database Structure: All database collections accessible

📋 STEP 2: Verifying Media in Published Listings Table
--------------------------------------------------------------------------------
ℹ️  Listings with media: 3
ℹ️  Listings without media: 0
✅ Listing 1: House - Cover: YES, Photos: 5, Videos: 1
✅ Media in Published Listings: 3/3 listings have media

📋 STEP 3: Verifying Media in Property Photos/Videos Tables
--------------------------------------------------------------------------------
✅ Listing listing_123: Media synced in both places
✅ Media Sync Between Tables: 3 listings properly synced, 0 out of sync

... (more tests)

================================================================================
  TEST SUMMARY
================================================================================
ℹ️  Total Tests: 8
✅ Passed: 8
❌ Failed: 0

🎉 ALL TESTS PASSED! Media persistence is working perfectly!
```

## 🔧 Manual Testing Steps

If you want to manually test media persistence:

### Test 1: Create Listing with Media (As Owner)

1. **Login as owner**
   - Go to login page
   - Login with your owner account

2. **Create a new listing**
   - Navigate to "Create Listing"
   - Fill in all property details
   - **Important**: Upload at least one cover photo and 2-3 property photos
   - Submit the listing

3. **Verify in Owner's Listings Page**
   - Go to "My Listings"
   - Check that your listing shows the cover photo
   - Click on the listing to see all photos

### Test 2: Verify Media Persists After Refresh (As Owner)

1. **While viewing your listings**
   - Note the photos visible in your listings
   - **Press F5 or refresh the page**
   - Wait for the page to reload

2. **Check if photos are still there**
   - ✅ **SUCCESS**: If photos still show after refresh
   - ❌ **FAIL**: If photos disappear after refresh

### Test 3: Verify Media Persists After Logout/Login (As Owner)

1. **While viewing your listings**
   - Note the photos visible in your listings
   - **Logout** from your account
   - **Login** again with the same owner account

2. **Navigate to "My Listings"**
   - Check if your listings still have photos
   - ✅ **SUCCESS**: If photos still show after login
   - ❌ **FAIL**: If photos disappear after re-login

### Test 4: Verify Tenant Can See Media (As Tenant)

1. **Login or signup as a tenant**
   - Use a different account (not the owner account)
   - Or create a new tenant account

2. **Go to tenant dashboard (Home page)**
   - Scroll through the property listings
   - Look for the listing you created as owner

3. **Check if media is visible**
   - ✅ **SUCCESS**: If you see the cover photo and property images
   - ❌ **FAIL**: If images are missing or show placeholders

### Test 5: Verify Tenant Media Persists After Refresh

1. **While viewing properties as tenant**
   - Note which properties have photos
   - **Press F5 or refresh the page**
   - Wait for the page to reload

2. **Check if photos are still there**
   - ✅ **SUCCESS**: If photos still show after refresh
   - ❌ **FAIL**: If photos disappear after refresh

## 🐛 Troubleshooting

### Issue: "No listings found in database"

**Solution**: 
- Create at least one listing as an owner first
- Make sure you add photos when creating the listing
- Then run the test again

### Issue: "Media in published_listings but NOT in property_photos/videos"

**Solution**:
- The app should auto-sync media on startup
- If not synced, add this to your app startup code in `app/_layout.tsx`:

```typescript
import { refreshAllPropertyMedia } from '@/utils/media-storage';

// In your app initialization (useEffect)
useEffect(() => {
  refreshAllPropertyMedia();
}, []);
```

### Issue: "No media found in AsyncStorage"

**Solution**:
- Check that `savePropertyMediaToStorage()` is being called
- This should happen automatically in `savePropertyMedia()` function
- Verify in `utils/media-storage.ts` line 189

### Issue: "Photos disappear after refresh"

**Cause**: Media is not being persisted to AsyncStorage

**Solution**:
1. Check that your `create-listing.tsx` calls `savePropertyMedia()`
2. Verify `savePropertyMedia()` in `media-storage.ts` line 112
3. Ensure it calls `savePropertyMediaToStorage()` line 189

### Issue: "Photos show for owner but not for tenant"

**Cause**: Media is not synced to tenant-accessible tables

**Solution**:
1. Run the sync function on app startup:
```typescript
import { refreshAllPropertyMedia } from '@/utils/media-storage';
await refreshAllPropertyMedia();
```

2. Or manually trigger sync in tenant dashboard:
```typescript
// In app/(tabs)/index.tsx
useEffect(() => {
  syncOwnerMediaToDatabase();
}, []);
```

## ✅ Expected Behavior (All Tests Passing)

When everything is working correctly:

1. **Owner creates listing with photos**
   - Photos are saved to `published_listings` table
   - Photos are saved to `property_photos` table
   - Photos are saved to AsyncStorage
   - Photos are saved with proper base64 or URI data

2. **Owner refreshes page**
   - Photos reload from AsyncStorage (fast)
   - If not in AsyncStorage, photos reload from database
   - All photos remain visible

3. **Owner logs out and logs back in**
   - Photos are still in database
   - Photos are reloaded on login
   - All photos remain visible

4. **Tenant views properties**
   - Tenant can see all published listings
   - Each listing shows its cover photo
   - Click on listing shows all property photos
   - Photos are loaded from same database tables

5. **Tenant refreshes page**
   - All photos remain visible
   - Photos are cached for performance
   - No data loss occurs

## 📝 Code Verification Checklist

Ensure these functions are properly implemented:

- [ ] `savePropertyMedia()` - Saves media to database (`utils/media-storage.ts`)
- [ ] `savePropertyMediaToStorage()` - Saves media to AsyncStorage (`utils/media-storage.ts`)
- [ ] `loadPropertyMedia()` - Loads media from database (`utils/media-storage.ts`)
- [ ] `loadPropertyMediaFromStorage()` - Loads media from AsyncStorage (`utils/media-storage.ts`)
- [ ] `refreshAllPropertyMedia()` - Refreshes all media on startup (`utils/media-storage.ts`)
- [ ] Create listing calls `savePropertyMedia()` (`app/(owner)/create-listing.tsx` line 327)
- [ ] Owner listings loads media (`app/(owner)/listings.tsx`)
- [ ] Tenant dashboard loads media (`app/(tabs)/index.tsx`)

## 🎓 How Media Storage Works

```
┌─────────────────────────────────────────────────────┐
│  OWNER CREATES LISTING WITH PHOTOS                  │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  savePropertyMedia() called                         │
│  ├─ Saves to published_listings table               │
│  ├─ Saves to property_photos table                  │
│  ├─ Saves to property_videos table                  │
│  └─ Saves to AsyncStorage (for persistence)         │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  DATA STORED IN 3 PLACES                            │
│  ├─ Database (primary source)                       │
│  ├─ AsyncStorage (for quick access & persistence)   │
│  └─ Cache (for performance)                         │
└─────────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│  OWNER VIEWS     │      │  TENANT VIEWS    │
│  LISTINGS        │      │  PROPERTIES      │
├──────────────────┤      ├──────────────────┤
│ 1. Load from     │      │ 1. Load from     │
│    AsyncStorage  │      │    Database      │
│ 2. If not found, │      │ 2. Cache results │
│    load from DB  │      │ 3. Show to user  │
│ 3. Show to user  │      │                  │
└──────────────────┘      └──────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│  USER REFRESHES PAGE OR LOGS OUT/IN                 │
│  ├─ Media still in AsyncStorage ✅                  │
│  ├─ Media still in Database ✅                      │
│  └─ Media reloads automatically ✅                  │
└─────────────────────────────────────────────────────┘
```

## 🆘 Getting Help

If tests are failing and you can't figure out why:

1. **Check the console logs** - The test provides detailed output
2. **Run manual tests** - Follow the manual testing steps above
3. **Check the database** - Look at the actual data in AsyncStorage
4. **Review the code** - Use the code verification checklist

## 📞 Support

For issues or questions:
- Check the detailed test output for specific errors
- Review the troubleshooting section above
- Examine the code files mentioned in the checklist

---

**Test Version**: 1.0  
**Last Updated**: 2025-01-21  
**Compatibility**: HanapBahay App v1.0+

