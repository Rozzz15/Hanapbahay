# View Tracking Verification Guide

## Overview
This document explains how view tracking works and how to verify its accuracy.

## How View Tracking Works

### 1. **View Tracking System**
- Location: `utils/view-tracking.ts`
- Main functions:
  - `trackListingView()` - Tracks a view with metadata (checks if owner is viewing)
  - `incrementListingViews()` - Increments the view count for a listing
  - `getListingViews()` - Gets the current view count for a listing

### 2. **When Views Are Tracked**
Views are tracked in the following scenarios:
- **Tenant views a property** (via `app/property-preview.tsx`):
  - When a tenant opens a property preview page
  - Every time the component mounts (if not owner)
  
- **From dashboard** (via `app/(tabs)/index.tsx`):
  - When a tenant clicks to view a property from the listings

### 3. **Owner View Protection**
Owners viewing their own listings will **NOT** increment the view count:
- Checked via `isOwnerView` flag
- Checked by comparing `userId` (viewer) with `listing.userId` (owner)

### 4. **Where View Count is Stored**
- Field: `views` (number)
- Collection: `published_listings`
- Initial value: 0 or undefined

## Verification Steps

### Browser Console Test
1. Open your app in the browser
2. Open Developer Console (F12)
3. Run the test:
```javascript
// Load the test script
const script = document.createElement('script');
script.src = '/scripts/test-view-tracking-accuracy-browser.js';
document.body.appendChild(script);

// After script loads (wait a few seconds), run:
testViewTracking()
```

### Manual Verification

#### Check Total Views in Owner Dashboard
1. Login as an owner
2. Go to Owner Dashboard
3. Note the "Total Views" number
4. Go to My Listings page
5. Add up the view counts for each listing
6. Verify they match

#### Test View Increment
1. Login as a tenant (different from owner)
2. View a property from the listings
3. Note the view count before viewing
4. Open the property preview
5. Go back to the listing
6. Check if the view count incremented by 1

#### Test Owner View Blocking
1. Login as an owner
2. Go to your listings
3. Note the view count
4. Click to view one of your own properties
5. Go back to listings
6. Verify view count did NOT increase

## Expected Behavior

### ✅ Correct Behavior
- Tenant views a property → View count +1
- Owner views own property → View count unchanged
- Total views in dashboard = Sum of all listing views
- Each listing view count is accurate

### ❌ Incorrect Behavior
- Owner viewing own property increases view count (should not)
- View count doesn't update when tenant views
- Total views doesn't match sum of individual views
- View count is duplicated or incorrect

## Dashboard Statistics

### Owner Dashboard Stats
- **Total Views**: Sum of `views` field for all listings owned by the owner
- Calculated in: `utils/owner-dashboard.ts` → `getOwnerDashboardStats()`

```typescript
const totalViews = ownerListings.reduce((sum, listing) => sum + (listing.views || 0), 0);
```

### Per-Listing View Count
- Displayed in: `app/(owner)/listings.tsx`
- Shows the `views` field for each listing
- Also shown in Quick Actions cards

## Common Issues and Solutions

### Issue: Views not incrementing
**Possible causes:**
1. Tenant viewing property multiple times in same session
2. Owner viewing their own property
3. View tracking code not being called

**Solution:**
- Check browser console for view tracking logs
- Look for: `👁️ Tracking view for property:`
- Check for: `✅ View tracked successfully`

### Issue: Total views mismatch
**Possible causes:**
1. Cached data not refreshing
2. View count in listing doesn't match actual views
3. Multiple owners with same property ID

**Solution:**
- Refresh the dashboard
- Check each listing's view count individually
- Verify the ownerId for each listing

### Issue: Duplicate view counts
**Possible causes:**
1. View tracking called twice
2. Race condition in increment function

**Solution:**
- Check view tracking is only called once per property open
- Check for proper owner view blocking

## Database Schema

### Published Listing Record
```typescript
{
  id: string;
  userId: string; // Owner's user ID
  views: number; // View count
  inquiries: number; // Inquiry count
  // ... other fields
}
```

## Testing Checklist

- [ ] Tenant can view properties without errors
- [ ] View count increments when tenant views
- [ ] Owner viewing own property doesn't increment views
- [ ] Total views in dashboard matches sum of individual views
- [ ] View count persists after page refresh
- [ ] Multiple tenants viewing same property increments count correctly

## Debug Commands

### Get all listings with view counts
```javascript
// In browser console
const { db } = await import('./utils/db.ts');
const listings = await db.list('published_listings');
listings.forEach(l => console.log(`${l.propertyType}: ${l.views || 0} views`));
```

### Get owner's total views
```javascript
const { db } = await import('./utils/db.ts');
const listings = await db.list('published_listings');
const ownerListings = listings.filter(l => l.userId === 'YOUR_OWNER_ID');
const totalViews = ownerListings.reduce((sum, l) => sum + (l.views || 0), 0);
console.log(`Total views: ${totalViews}`);
```

### Manually increment view count
```javascript
const { incrementListingViews } = await import('./utils/view-tracking.ts');
await incrementListingViews('LISTING_ID');
```

### Check view count for specific listing
```javascript
const { getListingViews } = await import('./utils/view-tracking.ts');
const views = await getListingViews('LISTING_ID');
console.log(`Current views: ${views}`);
```

## Support

If you encounter issues with view tracking:
1. Check the browser console for error messages
2. Verify the database connection
3. Test with a fresh property listing
4. Check that view tracking functions are imported correctly

