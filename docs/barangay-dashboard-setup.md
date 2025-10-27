# Barangay Dashboard Setup Guide

## Overview

This document provides information about the Barangay Official Dashboard feature implemented in the HanapBahay application. The dashboard follows the same modern and professional design as the Owner Dashboard, ensuring consistency across the application.

## Features

- **Modern Dashboard Interface**: Clean, professional design matching the owner dashboard
- **Statistics Overview**: Track total residents, properties, listings, and active bookings in your barangay
- **Quick Actions**: Access to residents, properties, reports, and settings
- **Bottom Navigation**: Easy navigation between different sections
- **Role-Based Access**: Secure authentication and routing for barangay officials only

## User Accounts Created

Four barangay official accounts have been created, one for each barangay:

### 1. Barangay Rizal
- **Email**: brgy.rizal@hanapbahay.com
- **Password**: rizal123
- **Name**: Barangay Rizal Official
- **Phone**: +63 910 111 2222
- **Address**: Rizal Street, Dumaguete City
- **Barangay**: RIZAL

### 2. Barangay Talongon
- **Email**: brgy.talongon@hanapbahay.com
- **Password**: talongon123
- **Name**: Barangay Talongon Official
- **Phone**: +63 910 333 4444
- **Address**: Talongon Street, Dumaguete City
- **Barangay**: TALONGON

### 3. Barangay Gomez
- **Email**: brgy.gomez@hanapbahay.com
- **Password**: gomez123
- **Name**: Barangay Gomez Official
- **Phone**: +63 910 555 6666
- **Address**: Gomez Street, Dumaguete City
- **Barangay**: GOMEZ

### 4. Barangay Magsaysay
- **Email**: brgy.magsaysay@hanapbahay.com
- **Password**: magsaysay123
- **Name**: Barangay Magsaysay Official
- **Phone**: +63 910 777 8888
- **Address**: Magsaysay Street, Dumaguete City
- **Barangay**: MAGSAYSAY

## How to Login

1. Navigate to the login screen (`/login`)
2. Enter one of the email addresses above
3. Enter the corresponding password
4. Click "Sign In"
5. You will be automatically redirected to the Barangay Dashboard

## Dashboard Sections

### Dashboard (Overview)
- **Statistics Cards**: 
  - Total Residents: Number of registered users in your barangay
  - Total Properties: Number of available property listings
  - Active Listings: Published property listings
  - Active Bookings: On-going rental agreements

### Residents
- View and manage registered users in your barangay
- Access resident information and profiles

### Properties
- Browse available rental properties in your barangay
- View property listings and their details

### Reports
- Generate barangay reports and analytics
- Track housing statistics and trends

### Settings
- Manage your barangay dashboard settings
- Configure preferences and notifications

## Technical Implementation

### Files Created
- `app/(brgy)/_layout.tsx` - Layout wrapper for barangay section
- `app/(brgy)/dashboard.tsx` - Main dashboard page
- `app/(brgy)/residents.tsx` - Residents management page
- `app/(brgy)/properties.tsx` - Properties listing page
- `app/(brgy)/reports.tsx` - Reports and analytics page
- `app/(brgy)/settings.tsx` - Settings page
- `components/BrgyBottomNav.tsx` - Bottom navigation component
- `utils/brgy-dashboard.ts` - Utility functions for dashboard stats

### Files Modified
- `types/index.ts` - Added `brgy_official` role and `barangay` field
- `context/AuthContext.tsx` - Added `redirectBrgyOfficial()` function
- `utils/mock-auth.ts` - Added 4 barangay official accounts
- `app/login.tsx` - Added barangay official login routing

## Design System

The barangay dashboard uses the same design system as the owner dashboard:
- Same color scheme with modern green theme (#10B981)
- Consistent typography and spacing
- Shared component styles from `owner-dashboard-styles.ts`
- Clean card-based layouts with shadows and borders
- Responsive grid layouts for statistics

## Security

- Role-based authentication (users must have `brgy_official` role)
- Access control checks in layout component
- Protected routes that redirect to login if unauthorized
- Secure session management

## Example Usage

```typescript
// Logging in as Barangay Rizal Official
Email: brgy.rizal@hanapbahay.com
Password: rizal123

// After login, you'll see:
- Dashboard with statistics for RIZAL barangay
- Bottom navigation with 5 sections
- Quick action cards for common tasks
- Logout button in the header
```

## Next Steps for Enhancement

Future enhancements could include:
1. Resident verification and management
2. Property registration and compliance tracking
3. Detailed analytics and reporting features
4. Integration with local government systems
5. Communication tools for barangay-wide announcements
6. Document management for housing permits
7. Booking and rental monitoring tools

## Support

For questions or issues, contact the development team or refer to the main README.md file.

