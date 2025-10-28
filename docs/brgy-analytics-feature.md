# Brgy Analytics Feature - Gender Distribution

## Overview
This feature allows Brgy Officials to view tenant gender analytics based on approved bookings (when owners accept tenant payments) in their barangay.

## How It Works

### 1. Data Source
- Counts tenants with **approved bookings** in properties located within the barangay
- Uses tenant gender information from their user profile
- Only includes tenants whose bookings have been approved by property owners

### 2. Analytics Calculation
The system:
1. Finds all approved bookings (`status === 'approved'`)
2. Filters bookings for properties in the brgy official's barangay
3. Looks up tenant user records to get gender information
4. Counts genders (male, female, unknown/not specified)
5. Calculates percentages

### 3. Display
The Reports page shows:
- **Total Tenants**: Number of unique tenants with approved bookings
- **Gender Distribution**:
  - 👨 Male count and percentage
  - 👩 Female count and percentage  
  - ❓ Not Specified count (if any)

### 4. Visual Representation
- Progress bars showing gender distribution
- Percentage calculations
- Color-coded indicators (blue for male, pink for female, gray for unknown)

## Implementation Files

1. **`utils/brgy-analytics.ts`**
   - `getTenantGenderAnalytics(barangay)` - Main analytics function
   - Returns counts and percentages for each gender
   - Handles deduplication (only counts unique tenants once)

2. **`app/(brgy)/reports.tsx`**
   - UI for displaying analytics
   - Shows loading states
   - Refresh functionality
   - Professional visual design with progress bars

## Key Features

✅ **Accurate Counting**: Only counts tenants with approved bookings  
✅ **De-duplication**: Each tenant counted only once even if they have multiple approved bookings  
✅ **Real-time Data**: Pulls from current database state  
✅ **Barangay-specific**: Filters by barangay official's assigned area  
✅ **Visual Charts**: Progress bars showing distribution  
✅ **Refresh Button**: Manual update of analytics

## How to Access

1. Log in as a Brgy Official account
2. Navigate to the **Reports** tab (4th icon in bottom navigation)
3. View the analytics data

## Data Accuracy

The analytics are accurate because:
- Only approved bookings are counted (when owner accepts payment)
- Uses actual user profile data for gender
- Filters by property location in the barangay
- Deduplicates tenant counts automatically

## Example Output

```
Total Tenants: 45

Gender Distribution:
👨 Male: 25 (56%)
👩 Female: 18 (40%)
❓ Not Specified: 2 (4%)
```

## Notes

- Gender data comes from tenant registration (optional field)
- If gender is not specified, tenant is counted as "unknown/not specified"
- Analytics update when new bookings are approved
- Manual refresh button available to update data
