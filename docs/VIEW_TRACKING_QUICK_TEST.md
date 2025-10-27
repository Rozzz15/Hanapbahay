# View Tracking Quick Test Guide

## 🧪 Quick Test Steps

### 1. Test View Increment (5 minutes)

**Steps:**
1. Open app as a **Tenant** user
2. Go to Listings/Homes tab
3. Note the view count of a property (e.g., "12 views")
4. Click to view that property
5. Go back to listings
6. Check if view count increased (should be "13 views")

**✅ Expected Result:** View count increases by 1

---

### 2. Test Owner View Blocking (5 minutes)

**Steps:**
1. Login as an **Owner**
2. Go to "My Listings"
3. Note the view count of one of your properties
4. Click to preview that property
5. Go back to listings
6. Check view count

**✅ Expected Result:** View count stays the same (owner views don't count)

---

### 3. Test Total Views Accuracy (3 minutes)

**Steps:**
1. Login as an **Owner**
2. Go to Dashboard
3. Note the "Total Views" number (e.g., "45")
4. Go to "My Listings"
5. Add up the view counts from all your listings

**✅ Expected Result:** Sum matches "Total Views" in dashboard

**Formula:** Sum of all listing views = Dashboard Total Views

---

## 🔍 Quick Debug Commands

### Check all listings and their view counts:
```javascript
// In browser console
const { db } = await import('./utils/db.ts');
const listings = await db.list('published_listings');
console.table(listings.map(l => ({
  property: l.propertyType,
  address: l.address?.substring(0, 30),
  views: l.views || 0,
  owner: l.userId
})));
```

### Check owner's total views:
```javascript
const { db } = await import('./utils/db.ts');
const listings = await db.list('published_listings');
const YOUR_OWNER_ID = 'your_owner_id_here'; // Replace with your owner ID
const ownerListings = listings.filter(l => l.userId === YOUR_OWNER_ID);
const totalViews = ownerListings.reduce((sum, l) => sum + (l.views || 0), 0);
console.log(`Total views: ${totalViews}`);
console.table(ownerListings.map(l => ({
  property: l.propertyType,
  views: l.views || 0
})));
```

---

## ⚠️ Common Issues

### Issue: Views not incrementing
**Check:**
- Are you logged in as a tenant (not owner)?
- Check browser console for errors
- Look for: `👁️ Tracking view for property:`

### Issue: Owner view blocking not working
**Check:**
- Verify the `isOwnerView` flag is set correctly
- Check browser console for: `👁️ Skipping view tracking - owner viewing own listing`

### Issue: Total views mismatch
**Check:**
- Refresh the dashboard
- Verify each listing's view count individually
- Check if multiple owners own the same property (shouldn't happen)

---

## 📊 Expected Console Output

### When Tenant Views Property:
```
👁️ Tracking view for property: listing_123
✅ Views incremented for listing listing_123: 5 → 6
✅ View tracked successfully: Views incremented from 5 to 6
```

### When Owner Views Own Property:
```
👁️ Skipping view tracking - owner viewing own listing
```

---

## ✅ Success Criteria

Your view tracking is working correctly if:
1. ✓ Tenant views increment the count
2. ✓ Owner views don't increment the count
3. ✓ Dashboard total = Sum of all listing views
4. ✓ View counts persist after refresh

