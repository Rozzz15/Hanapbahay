# Fix: Owner Listings Not Showing in Tenant Dashboard

## 🔍 Problem

When owners create listings, they don't appear in the tenant dashboard. This guide will help you diagnose and fix the issue.

## 🚀 Quick Fix - Add Debug Button

### Step 1: Add Debug Button to Tenant Dashboard

**Open `app/(tabs)/index.tsx`**

Add import at the top:
```typescript
import TenantListingDebugButton from '@/components/TenantListingDebugButton';
```

Find the header section (around line 800-900) and add the button:
```typescript
{/* Add debug button in header */}
<View style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
  <TenantListingDebugButton />
</View>
```

### Step 2: Run the Diagnostic

1. **Open your app** in web browser
2. **Login as a tenant** (or stay on home page)
3. **Click the "Debug Listings" button** (orange button in top-right)
4. **Review the diagnostic results**

## 📊 Understanding the Results

### ✅ If "Valid (Will Show): 0"
**Problem**: No valid listings in database

**Solutions**:
1. Login as an owner
2. Create a new listing with all required fields
3. Make sure to add photos
4. Submit the listing
5. Login as tenant - listing should now appear

### ⚠️ If "Invalid (Hidden): X"
**Problem**: Listings exist but have issues

**Common Issues**:

#### Issue 1: Status is not "published"
```
❌ Status is "draft"
```
**Fix**: The listing status must be exactly "published" (lowercase)

Check `app/(owner)/create-listing.tsx` line 281:
```typescript
status: 'published',  // ✅ Correct
// NOT: status: 'Published' ❌
// NOT: status: 'PUBLISHED' ❌
// NOT: status: 'draft' ❌
```

#### Issue 2: Missing ID
```
❌ Missing ID
```
**Fix**: Listing wasn't saved properly. Re-create the listing.

## 🛠️ Manual Fixes

### Fix 1: Verify Listing Status

**Open browser console** (F12) and run:
```javascript
// Check all listings
import { db } from './utils/db';
const listings = await db.list('published_listings');
listings.forEach(l => console.log(l.id, l.status));
```

**Expected output**:
```
listing_xxx_xxx "published" ✅
listing_yyy_yyy "published" ✅
```

**If you see**:
```
listing_xxx_xxx "draft" ❌
listing_xxx_xxx "Published" ❌ (uppercase)
listing_xxx_xxx undefined ❌
```

**Then fix it**:
```javascript
// Update status for a specific listing
await db.upsert('published_listings', 'listing_xxx_xxx', {
  ...existingListing,
  status: 'published'
});
```

### Fix 2: Check Tenant Dashboard Filter Logic

The tenant dashboard filters listings using this logic:

```typescript
// From app/(tabs)/index.tsx line 595-626
const validListings = publishedListings.filter((p) => {
  const hasId = p && p.id;
  const isPublished = p && p.status && p.status.toLowerCase() === 'published';
  return hasId && isPublished;
});
```

**Requirements for listings to show**:
1. ✅ Must have an `id` field
2. ✅ Must have a `status` field  
3. ✅ Status must equal "published" (case-insensitive)

### Fix 3: Clear Cache and Refresh

Sometimes cached data prevents new listings from showing:

```javascript
// In browser console
import { clearCache } from './utils/db';
await clearCache();
window.location.reload();
```

Or use the app's refresh functionality:
1. Pull down to refresh on mobile
2. Press F5 on web
3. Or add a refresh button

## 🧪 Testing Steps

### Test 1: Create a listing as owner

1. Login as owner
2. Go to "Create Listing"
3. Fill in all fields:
   - Property Type ✅
   - Rental Type ✅
   - Monthly Rent ✅
   - Address ✅
   - Description ✅
   - Bedrooms ✅
   - Bathrooms ✅
   - Contact Info ✅
   - **Upload photos** ✅ (important!)
4. Click "Create Listing"
5. Verify you see "Success! 🎉" message

### Test 2: Verify in owner's listings

1. Go to "My Listings" as owner
2. Verify your listing appears
3. Check status badge shows "● Published"
4. Verify photos are visible

### Test 3: Check in tenant dashboard

1. **Logout** from owner account
2. **Login as tenant** (or view as guest)
3. **Go to home/dashboard**
4. **Look for your listing** in the property cards
5. **If not visible**, click "Debug Listings" button

### Test 4: Run diagnostic

1. Click "Debug Listings" button
2. Check "Valid (Will Show)" count
3. If count is 0, review the issues listed
4. Fix any invalid listings
5. Refresh page and check again

## 🔧 Common Solutions

### Solution 1: Recreate Invalid Listings

If diagnostic shows invalid listings:

1. Login as owner
2. Delete the invalid listing
3. Create a new listing
4. Make sure all required fields are filled
5. Submit
6. Test in tenant dashboard

### Solution 2: Fix Status Field

If status is wrong:

**Option A**: Delete and recreate the listing

**Option B**: Fix in database (advanced):
```javascript
// Browser console
import { db } from './utils/db';

// Get the listing
const listing = await db.get('published_listings', 'YOUR_LISTING_ID');

// Fix the status
listing.status = 'published';

// Save back
await db.upsert('published_listings', 'YOUR_LISTING_ID', listing);

// Clear cache
import { clearCache } from './utils/db';
await clearCache();

// Refresh page
window.location.reload();
```

### Solution 3: Check for Empty Database

If database is completely empty:

1. Check if owner account exists
2. Verify owner can access "Create Listing" page
3. Create a test listing with minimal data
4. Check if it saves to database

## 📞 Still Not Working?

If listings still don't show after trying all fixes:

1. **Check browser console** for errors (F12 → Console tab)
2. **Check network tab** for failed requests
3. **Run the diagnostic** and share the output
4. **Check AsyncStorage**:
   ```javascript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   const keys = await AsyncStorage.getAllKeys();
   console.log('Storage keys:', keys);
   
   const data = await AsyncStorage.getItem('hb_db_published_listings');
   console.log('Listings data:', JSON.parse(data));
   ```

## 💡 Prevention Tips

To avoid this issue in the future:

1. **Always verify** listings show in owner's "My Listings" after creation
2. **Test as tenant** after creating listings
3. **Add the debug button** permanently for easy troubleshooting
4. **Check status field** is always "published"
5. **Use the media persistence test** to verify photos persist

---

**Need more help?**
- Review the console logs when creating/viewing listings
- Check the diagnostic output carefully
- Ensure all required fields are filled when creating listings

