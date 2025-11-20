import { db } from './db';
import { BookingRecord, DbUserRecord, OwnerApplicationRecord } from '../types';

export interface GenderAnalytics {
  total: number;
  male: number;
  female: number;
  unknown: number;
  malePercentage: number;
  femalePercentage: number;
}

export interface ComprehensiveAnalytics {
  // Tenant Demographics
  genderAnalytics: GenderAnalytics;
  tenantTypeAnalytics: {
    individual: number;
    family: number;
    couple: number;
    group: number;
    totalPeople: number; // Total number of people from family and group bookings
  };
  
  // Owner Demographics
  ownerAnalytics: {
    totalOwners: number;
    maleOwners: number;
    femaleOwners: number;
    unknownOwners: number;
    maleOwnerPercentage: number;
    femaleOwnerPercentage: number;
    averagePropertiesPerOwner: number;
    topOwners: Array<{
      ownerId: string;
      ownerName: string;
      propertyCount: number;
      totalRevenue: number;
    }>;
  };
  
  // Property Analytics
  totalProperties: number;
  availableProperties: number;
  occupiedProperties: number;
  reservedProperties: number;
  averageRent: number;
  propertyTypes: Record<string, number>;
  
  // Booking Analytics
  totalBookings: number;
  approvedBookings: number;
  pendingBookings: number;
  rejectedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  bookingTrends: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  
  // Payment Methods (kept for payment analytics, not financial summary)
  paymentMethods: Record<string, number>;
  
  // Activity Analytics
  totalInquiries: number;
  totalViews: number;
  averageViewsPerProperty: number;
  
  // Time-based Analytics
  recentActivity: {
    newBookings: number;
    newProperties: number;
    newInquiries: number;
    newOwners: number;
    newTenants: number;
  };
  
  // Tenant-Owner Relationship Analytics
  relationshipAnalytics: {
    averageBookingsPerOwner: number;
    averageBookingsPerTenant: number;
    mostActiveOwners: Array<{
      ownerId: string;
      ownerName: string;
      bookingCount: number;
      propertyCount: number;
      revenue: number;
    }>;
    mostActiveTenants: Array<{
      tenantId: string;
      tenantName: string;
      bookingCount: number;
    }>;
    conversionRate: number; // Approved bookings / Total bookings
  };
  
  // Market Analytics
  marketAnalytics: {
    occupancyRate: number;
    averageDaysOnMarket: number;
    priceRange: {
      min: number;
      max: number;
      median: number;
    };
    popularPropertyTypes: Array<{
      type: string;
      count: number;
      averageRent: number;
    }>;
  };
}

/**
 * Get gender analytics for tenants with approved bookings in a barangay
 * This counts tenants by gender based on approved bookings (when owner accepts payment)
 */
export async function getTenantGenderAnalytics(barangay: string): Promise<GenderAnalytics> {
  try {
    console.log('📊 Getting gender analytics for barangay:', barangay);
    
    // Get all approved bookings
    const allBookings = await db.list<BookingRecord>('bookings');
    console.log(`📋 Total bookings in database: ${allBookings.length}`);
    
    const approvedBookings = allBookings.filter(
      booking => booking.status === 'approved'
    );
    
    // Filter to only include bookings with paid payment status
    // Only count tenants with completed payments as residents
    const paidApprovedBookings = approvedBookings.filter(
      booking => booking.paymentStatus === 'paid'
    );
    
    console.log(`✅ Found ${approvedBookings.length} approved bookings`);
    console.log(`💳 Found ${paidApprovedBookings.length} paid approved bookings`);
    
    // Log booking status breakdown
    const statusBreakdown = allBookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('📊 Booking status breakdown:', statusBreakdown);
    
    // Get all published listings in this barangay (match dashboard logic)
    const allListings = await db.list('published_listings');
    const allUsers = await db.list<DbUserRecord>('users');
    console.log(`📋 Total listings in database: ${allListings.length}`);
    
    const barangayListings = allListings.filter(listing => {
      // Check barangay match
      let isInBarangay = false;
      if (listing.barangay) {
        const listingBarangay = listing.barangay.trim().toUpperCase();
        const targetBarangay = barangay.trim().toUpperCase();
        console.log(`🔍 Gender Analytics: Comparing listing barangay "${listingBarangay}" with target "${targetBarangay}"`);
        isInBarangay = listingBarangay === targetBarangay;
      } else {
        // Fallback: if barangay field not set, check via user
        const listingUser = allUsers.find(u => u.id === listing.userId);
        const userBarangay = listingUser?.barangay;
        if (userBarangay) {
          isInBarangay = userBarangay.trim().toUpperCase() === barangay.trim().toUpperCase();
        }
      }
      
      return isInBarangay;
    });
    
    console.log(`✅ Found ${barangayListings.length} listings in ${barangay}`);
    
    // Get property IDs for this barangay
    const barangayPropertyIds = barangayListings.map(listing => listing.id);
    console.log(`📍 Property IDs in ${barangay}:`, barangayPropertyIds);
    
    // Filter bookings for properties in this barangay with paid payment status
    const barangayBookings = paidApprovedBookings.filter(
      booking => barangayPropertyIds.includes(booking.propertyId)
    );
    
    console.log(`✅ Found ${barangayBookings.length} paid approved bookings for properties in ${barangay}`);
    
    // If no matches, log why
    if (barangayBookings.length === 0 && paidApprovedBookings.length > 0) {
      console.log('⚠️  No paid bookings match barangay filter. Checking...');
      paidApprovedBookings.forEach(booking => {
        console.log(`  Booking for property ${booking.propertyId} (${booking.propertyTitle})`);
      });
    }
    
    // Get all users to look up tenant genders (already fetched above)
    
    // Count genders
    const genderCounts = {
      total: 0,
      male: 0,
      female: 0,
      unknown: 0,
    };
    
    // Track unique tenants to avoid double counting
    const processedTenants = new Set<string>();
    
    for (const booking of barangayBookings) {
      if (processedTenants.has(booking.tenantId)) {
        continue; // Skip if we've already counted this tenant
      }
      
      processedTenants.add(booking.tenantId);
      
      // Find the tenant user record
      const tenantUser = allUsers.find(user => user.id === booking.tenantId);
      
      if (!tenantUser) {
        console.warn(`⚠️ Tenant user not found for booking ${booking.id}, tenantId: ${booking.tenantId}`);
        genderCounts.unknown++;
        continue;
      }
      
      // Count gender for analytics - check user record first, then tenant profile as fallback
      let tenantGender = tenantUser.gender;
      
      // Fallback: If gender not in user record, check tenant profile
      if (!tenantGender) {
        try {
          const tenantProfile = await db.get('tenants', booking.tenantId);
          if (tenantProfile && tenantProfile.gender) {
            tenantGender = tenantProfile.gender;
            console.log(`⚠️ Gender found in tenant profile (fallback) for ${tenantUser.name}`);
            
            // Update user record with gender from tenant profile for consistency
            const updatedUser = {
              ...tenantUser,
              gender: tenantProfile.gender,
              updatedAt: new Date().toISOString()
            };
            await db.upsert('users', booking.tenantId, updatedUser);
            console.log(`✅ Updated user record with gender from tenant profile`);
          }
        } catch (profileError) {
          console.warn(`⚠️ Could not fetch tenant profile for ${booking.tenantId}:`, profileError);
        }
      }
      
      // Count gender for analytics
      if (tenantGender) {
        genderCounts.total++;
        if (tenantGender === 'male') {
          genderCounts.male++;
        } else if (tenantGender === 'female') {
          genderCounts.female++;
        }
        console.log(`✅ Tenant ${tenantUser.name} (${booking.tenantId}): Gender = ${tenantGender}`);
      } else {
        console.warn(`⚠️ Tenant ${tenantUser.name} (${booking.tenantId}) has no gender data - cannot include in analytics`);
        genderCounts.unknown++;
      }
    }
    
    // Calculate percentages
    const malePercentage = genderCounts.total > 0 
      ? Math.round((genderCounts.male / genderCounts.total) * 100) 
      : 0;
    const femalePercentage = genderCounts.total > 0 
      ? Math.round((genderCounts.female / genderCounts.total) * 100) 
      : 0;
    
    const analytics: GenderAnalytics = {
      total: genderCounts.total,
      male: genderCounts.male,
      female: genderCounts.female,
      unknown: genderCounts.unknown,
      malePercentage,
      femalePercentage,
    };
    
    console.log('📊 Gender Analytics:', analytics);
    
    return analytics;
    
  } catch (error) {
    console.error('❌ Error getting gender analytics:', error);
    
    // Return empty analytics on error
    return {
      total: 0,
      male: 0,
      female: 0,
      unknown: 0,
      malePercentage: 0,
      femalePercentage: 0,
    };
  }
}

/**
 * Get comprehensive analytics for a barangay including tenants, owners, and relationships
 */
export async function getComprehensiveAnalytics(barangay: string): Promise<ComprehensiveAnalytics> {
  // Validate barangay input
  if (!barangay || !barangay.trim()) {
    console.warn('⚠️ Empty barangay provided to getComprehensiveAnalytics');
    barangay = '';
  }
  
  try {
    console.log('📊 Getting comprehensive analytics for barangay:', barangay);
    console.log('📊 Barangay trimmed:', barangay.trim());
    console.log('📊 Barangay uppercase:', barangay.trim().toUpperCase());
    
    // Get gender analytics
    const genderAnalytics = await getTenantGenderAnalytics(barangay);
    
    // Get all data
    const [allBookings, allListings, allUsers] = await Promise.all([
      db.list<BookingRecord>('bookings'),
      db.list('published_listings'),
      db.list<DbUserRecord>('users')
    ]);
    
    console.log('📊 Total bookings:', allBookings.length);
    console.log('📊 Total listings:', allListings.length);
    console.log('📊 Total users:', allUsers.length);
    
    // Filter listings by barangay (include all listings for analytics, not just available)
    const barangayListings = allListings.filter(listing => {
      // Check barangay match
      let isInBarangay = false;
      if (listing.barangay) {
        const listingBarangay = listing.barangay.trim().toUpperCase();
        const targetBarangay = barangay.trim().toUpperCase();
        console.log(`🔍 Analytics: Comparing listing barangay "${listingBarangay}" with target "${targetBarangay}"`);
        isInBarangay = listingBarangay === targetBarangay;
      } else {
        // Fallback: if barangay field not set, check via user
        const listingUser = allUsers.find(u => u.id === listing.userId);
        const userBarangay = listingUser?.barangay;
        if (userBarangay) {
          isInBarangay = userBarangay.trim().toUpperCase() === barangay.trim().toUpperCase();
        }
      }
      
      return isInBarangay;
    });
    
    // Sync statuses for barangay listings to ensure they're up to date
    // This fixes any listings that might be out of sync
    try {
      const { updateListingAvailabilityStatus } = await import('./listing-capacity');
      console.log(`🔄 Syncing statuses for ${barangayListings.length} barangay listings...`);
      for (const listing of barangayListings) {
        if (listing.id) {
          await updateListingAvailabilityStatus(listing.id);
        }
      }
      console.log(`✅ Finished syncing barangay listing statuses`);
    } catch (syncError) {
      console.warn('⚠️ Could not sync listing statuses (non-critical):', syncError);
    }
    
    console.log('📊 Total listings before filtering:', allListings.length);
    console.log('📊 Barangay listings found:', barangayListings.length);
    console.log('📊 Barangay listings:', barangayListings.map(l => ({ id: l.id, barangay: l.barangay, title: l.title })));
    
    const barangayPropertyIds = barangayListings.map(listing => listing.id);
    console.log('📊 Barangay property IDs:', barangayPropertyIds);
    
    // Filter bookings by barangay
    const barangayBookings = allBookings.filter(booking => 
      barangayPropertyIds.includes(booking.propertyId)
    );
    
    console.log('📊 Found barangay bookings:', barangayBookings.length);
    
    // Filter bookings to only include those with paid payment status for tenant counting
    // Only count tenants with completed payments as residents
    const paidBarangayBookings = barangayBookings.filter(
      booking => booking.status === 'approved' && booking.paymentStatus === 'paid'
    );
    
    // Get unique tenants in this barangay (from paid bookings)
    const barangayTenantIds = [...new Set(paidBarangayBookings.map(booking => booking.tenantId))];
    const barangayTenants = allUsers.filter(user => barangayTenantIds.includes(user.id));
    
    // Get approved owners from owner_applications table (same as dashboard)
    // This ensures we only count owners who have been officially approved
    const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
    const approvedApplicationsInBarangay = allApplications.filter(
      app => app.status === 'approved' && app.barangay?.toUpperCase() === barangay.toUpperCase()
    );
    
    // Get unique approved owner IDs from applications
    const approvedOwnerIds = [...new Set(approvedApplicationsInBarangay.map(app => app.userId))];
    const barangayOwners = allUsers.filter(user => approvedOwnerIds.includes(user.id));
    
    console.log('📊 Approved owners count (analytics):', {
      barangay,
      totalApprovedOwners: approvedOwnerIds.length,
      approvedApplications: approvedApplicationsInBarangay.length,
      approvedOwnerIds: approvedOwnerIds.length,
      barangayOwnersFound: barangayOwners.length
    });
    
    // Owner Analytics
    const ownerGenderCounts = {
      total: barangayOwners.length,
      male: 0,
      female: 0,
      unknown: 0,
    };
    
    barangayOwners.forEach(owner => {
      if (owner.gender === 'male') {
        ownerGenderCounts.male++;
      } else if (owner.gender === 'female') {
        ownerGenderCounts.female++;
      } else {
        ownerGenderCounts.unknown++;
      }
    });
    
    const maleOwnerPercentage = ownerGenderCounts.total > 0 
      ? Math.round((ownerGenderCounts.male / ownerGenderCounts.total) * 100) 
      : 0;
    const femaleOwnerPercentage = ownerGenderCounts.total > 0 
      ? Math.round((ownerGenderCounts.female / ownerGenderCounts.total) * 100) 
      : 0;
    
    // Calculate properties per owner and top owners (using approved owners)
    const ownerStats = approvedOwnerIds.map(ownerId => {
      const owner = allUsers.find(u => u.id === ownerId);
      const ownerProperties = barangayListings.filter(l => l.userId === ownerId);
      const ownerBookings = barangayBookings.filter(b => b.ownerId === ownerId);
      const ownerRevenue = ownerBookings
        .filter(b => b.status === 'approved')
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      
      return {
        ownerId,
        ownerName: owner?.name || 'Unknown',
        propertyCount: ownerProperties.length,
        totalRevenue: ownerRevenue,
      };
    });
    
    const topOwners = ownerStats
      .sort((a, b) => b.propertyCount - a.propertyCount)
      .slice(0, 5);
    
    const averagePropertiesPerOwner = barangayOwners.length > 0 
      ? Math.round(barangayListings.length / barangayOwners.length * 10) / 10 
      : 0;
    
    // Property Analytics
    const totalProperties = barangayListings.length;
    
    // Normalize and count property statuses (case-insensitive, handle null/undefined)
    const statusCounts = {
      available: 0,
      occupied: 0,
      reserved: 0,
      unknown: 0
    };
    
    barangayListings.forEach(listing => {
      // Get status and normalize (handle null/undefined, case-insensitive)
      const rawStatus = listing.availabilityStatus;
      const status = rawStatus ? String(rawStatus).toLowerCase().trim() : 'available';
      
      if (status === 'available') {
        statusCounts.available++;
      } else if (status === 'occupied') {
        statusCounts.occupied++;
      } else if (status === 'reserved') {
        statusCounts.reserved++;
      } else {
        statusCounts.unknown++;
        // Log unknown statuses for debugging
        console.warn(`⚠️ Unknown property status: "${rawStatus}" for listing ${listing.id} (normalized to: "${status}")`);
      }
    });
    
    const availableProperties = statusCounts.available;
    const occupiedProperties = statusCounts.occupied;
    const reservedProperties = statusCounts.reserved;
    
    // Log status breakdown for debugging
    console.log('📊 Property Status Breakdown:', {
      total: totalProperties,
      available: availableProperties,
      occupied: occupiedProperties,
      reserved: reservedProperties,
      unknown: statusCounts.unknown,
      sum: availableProperties + occupiedProperties + reservedProperties + statusCounts.unknown
    });
    
    // Verify all properties are accounted for
    if (totalProperties !== (availableProperties + occupiedProperties + reservedProperties + statusCounts.unknown)) {
      console.warn('⚠️ Property status count mismatch!', {
        total: totalProperties,
        counted: availableProperties + occupiedProperties + reservedProperties + statusCounts.unknown
      });
    }
    
    const rents = barangayListings.map(l => l.monthlyRent || 0).filter(r => r > 0);
    const averageRent = rents.length > 0 ? rents.reduce((a, b) => a + b, 0) / rents.length : 0;
    
    const propertyTypes = barangayListings.reduce((acc, listing) => {
      let type = listing.propertyType || 'Unknown';
      // Normalize "Condo" to "Boarding House" for consistency
      if (type === 'Condo') {
        type = 'Boarding House';
      }
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Booking Analytics
    // Include ALL bookings including soft-deleted ones for accurate analytics
    // This ensures deleted bookings (rejected, pending, cancelled, completed) are still counted
    const totalBookings = barangayBookings.length;
    // Only count non-deleted approved bookings (active approved bookings)
    const approvedBookings = barangayBookings.filter(b => b.status === 'approved' && !b.isDeleted).length;
    // Include ALL pending bookings (including deleted) for analytics
    const pendingBookings = barangayBookings.filter(b => b.status === 'pending').length;
    // Include ALL rejected bookings (including deleted) for analytics
    const rejectedBookings = barangayBookings.filter(b => b.status === 'rejected').length;
    // Include ALL cancelled bookings (including deleted) for analytics
    const cancelledBookings = barangayBookings.filter(b => b.status === 'cancelled').length;
    // Include ALL completed bookings (including deleted) for analytics
    const completedBookings = barangayBookings.filter(b => b.status === 'completed').length;
    
    // Count deleted bookings by status for analytics
    const deletedRejectedBookings = barangayBookings.filter(b => b.status === 'rejected' && b.isDeleted).length;
    const deletedPendingBookings = barangayBookings.filter(b => b.status === 'pending' && b.isDeleted).length;
    const deletedCancelledBookings = barangayBookings.filter(b => b.status === 'cancelled' && b.isDeleted).length;
    const deletedCompletedBookings = barangayBookings.filter(b => b.status === 'completed' && b.isDeleted).length;
    
    console.log('📊 Booking Status Breakdown (including deleted):', {
      total: totalBookings,
      approved: approvedBookings,
      pending: pendingBookings,
      rejected: rejectedBookings,
      cancelled: cancelledBookings,
      completed: completedBookings,
      deletedRejected: deletedRejectedBookings,
      deletedPending: deletedPendingBookings,
      deletedCancelled: deletedCancelledBookings,
      deletedCompleted: deletedCompletedBookings
    });
    
    // Booking trends (last 2 months)
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const thisMonthBookings = barangayBookings.filter(b => 
      new Date(b.createdAt) >= thisMonth
    ).length;
    
    const lastMonthBookings = barangayBookings.filter(b => {
      const bookingDate = new Date(b.createdAt);
      return bookingDate >= lastMonth && bookingDate < thisMonth;
    }).length;
    
    const growthRate = lastMonthBookings > 0 
      ? Math.round(((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100)
      : 0;
    
    // Payment Methods (kept for payment analytics, not financial summary)
    const paymentMethods = barangayBookings.reduce((acc, booking) => {
      const method = booking.selectedPaymentMethod || 'Unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Tenant Type Analytics
    const tenantTypeCounts = {
      individual: 0,
      family: 0,
      couple: 0,
      group: 0,
    };
    
    // Helper function to calculate people count from booking
    const getPeopleCountFromBooking = (booking: BookingRecord): number => {
      if (!booking.tenantType) return 1; // Default to 1 if no tenant type
      
      switch (booking.tenantType) {
        case 'individual':
          return 1;
        case 'couple':
          return 2;
        case 'family':
        case 'group':
          // Count tenant (1) + family/group members (numberOfPeople)
          const members = booking.numberOfPeople || 0;
          return 1 + members;
        default:
          return 1;
      }
    };
    
    let totalPeople = 0;
    
    // Only count paid approved bookings for total people (residents)
    const paidBarangayBookingsForPeople = barangayBookings.filter(
      booking => booking.status === 'approved' && booking.paymentStatus === 'paid'
    );
    
    paidBarangayBookingsForPeople.forEach(booking => {
      if (booking.tenantType) {
        if (booking.tenantType === 'individual') {
          tenantTypeCounts.individual++;
        } else if (booking.tenantType === 'family') {
          tenantTypeCounts.family++;
        } else if (booking.tenantType === 'couple') {
          tenantTypeCounts.couple++;
        } else if (booking.tenantType === 'group') {
          tenantTypeCounts.group++;
        }
      } else {
        // For bookings without tenant type, count as individual
        tenantTypeCounts.individual++;
      }
      // Add total people count including tenant + family/group members
      totalPeople += getPeopleCountFromBooking(booking);
    });
    
    // Activity Analytics
    const totalInquiries = barangayBookings.length; // Using bookings as proxy for inquiries
    // Get total views - check both 'views' and 'viewCount' for compatibility
    const totalViews = barangayListings.reduce((sum, listing) => {
      const views = (listing as any).views || (listing as any).viewCount || 0;
      return sum + views;
    }, 0);
    const averageViewsPerProperty = totalProperties > 0 ? totalViews / totalProperties : 0;
    
    console.log('📊 Total Views Calculation:', {
      totalProperties,
      totalViews,
      averageViewsPerProperty: averageViewsPerProperty.toFixed(2),
      sampleListingViews: barangayListings.slice(0, 3).map(l => ({
        id: l.id,
        title: l.title,
        views: (l as any).views || (l as any).viewCount || 0
      }))
    });
    
    // Recent Activity (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentBookings = barangayBookings.filter(b => 
      new Date(b.createdAt) >= sevenDaysAgo
    ).length;
    
    const recentProperties = barangayListings.filter(l => 
      new Date(l.publishedAt || l.createdAt) >= sevenDaysAgo
    ).length;
    
    // Count recently approved owners (based on approval date, not account creation)
    const recentOwners = approvedApplicationsInBarangay.filter(app => {
      const approvalDate = app.reviewedAt || app.createdAt;
      return new Date(approvalDate) >= sevenDaysAgo;
    }).length;
    
    // Recent tenants should only count those with paid bookings
    const recentTenants = paidBarangayBookings.filter(b => 
      new Date(b.createdAt) >= sevenDaysAgo
    ).length;
    
    // Count recent inquiries from listing_inquiries table
    let recentInquiries = 0;
    try {
      const allInquiries = await db.list('listing_inquiries');
      const barangayInquiryIds = barangayPropertyIds;
      const barangayInquiries = allInquiries.filter(inquiry => 
        inquiry?.listingId && barangayInquiryIds.includes(inquiry.listingId)
      );
      recentInquiries = barangayInquiries.filter(inquiry => {
        const inquiryDate = inquiry?.createdAt || inquiry?.timestamp;
        if (!inquiryDate) return false;
        try {
          return new Date(inquiryDate) >= sevenDaysAgo;
        } catch (dateError) {
          console.warn('⚠️ Invalid inquiry date:', inquiryDate);
          return false;
        }
      }).length;
    } catch (error) {
      console.warn('⚠️ Could not fetch inquiries, using bookings as fallback:', error);
      // Fallback: use recent bookings as proxy for inquiries
      recentInquiries = recentBookings;
    }
    
    // Enhanced logging for Last 7 Days
    console.log('📅 Last 7 Days Activity Summary:', {
      dateRange: {
        from: sevenDaysAgo.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0]
      },
      newBookings: recentBookings,
      newProperties: recentProperties,
      newOwners: recentOwners,
      newTenants: recentTenants,
      newInquiries: recentInquiries
    });
    
    // Tenant-Owner Relationship Analytics
    const averageBookingsPerOwner = barangayOwners.length > 0 
      ? Math.round((barangayBookings.length / barangayOwners.length) * 10) / 10 
      : 0;
    
    const averageBookingsPerTenant = barangayTenants.length > 0 
      ? Math.round((barangayBookings.length / barangayTenants.length) * 10) / 10 
      : 0;
    
    // Most active owners (by booking count) - include property count
    const mostActiveOwners = ownerStats
      .map(owner => {
        const ownerProperties = barangayListings.filter(l => l.userId === owner.ownerId);
        return {
          ownerId: owner.ownerId,
          ownerName: owner.ownerName,
          bookingCount: barangayBookings.filter(b => b.ownerId === owner.ownerId).length,
          propertyCount: ownerProperties.length,
          revenue: owner.totalRevenue,
        };
      })
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 5);
    
    // Most active tenants
    const tenantStats = barangayTenantIds.map(tenantId => {
      const tenant = allUsers.find(u => u.id === tenantId);
      const tenantBookings = barangayBookings.filter(b => b.tenantId === tenantId);
      
      return {
        tenantId,
        tenantName: tenant?.name || 'Unknown',
        bookingCount: tenantBookings.length,
      };
    });
    
    const mostActiveTenants = tenantStats
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 5);
    
    const conversionRate = totalBookings > 0 
      ? Math.round((approvedBookings / totalBookings) * 100) 
      : 0;
    
    // Market Analytics
    const occupancyRate = totalProperties > 0 
      ? Math.round((occupiedProperties / totalProperties) * 100) 
      : 0;
    
    // Calculate average days on market (simplified)
    const averageDaysOnMarket = barangayListings.length > 0 
      ? Math.round(barangayListings.reduce((sum, listing) => {
          const publishedDate = new Date(listing.publishedAt || listing.createdAt);
          const daysOnMarket = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysOnMarket;
        }, 0) / barangayListings.length)
      : 0;
    
    // Price range analysis
    const sortedRents = rents.sort((a, b) => a - b);
    const priceRange = {
      min: sortedRents.length > 0 ? sortedRents[0] : 0,
      max: sortedRents.length > 0 ? sortedRents[sortedRents.length - 1] : 0,
      median: sortedRents.length > 0 ? sortedRents[Math.floor(sortedRents.length / 2)] : 0,
    };
    
    // Popular property types with average rent
    const popularPropertyTypes = Object.entries(propertyTypes).map(([type, count]) => {
      // Normalize type for filtering (handle both "Condo" and "Boarding House")
      const normalizedType = type === 'Boarding House' ? 'Boarding House' : type;
      const typeListings = barangayListings.filter(l => {
        const listingType = l.propertyType || 'Unknown';
        // Match both "Condo" and "Boarding House" for the normalized type
        return listingType === normalizedType || (normalizedType === 'Boarding House' && listingType === 'Condo');
      });
      const typeRents = typeListings.map(l => l.monthlyRent || 0).filter(r => r > 0);
      const averageRentForType = typeRents.length > 0 
        ? Math.round(typeRents.reduce((a, b) => a + b, 0) / typeRents.length) 
        : 0;
      
      return {
        type: normalizedType,
        count,
        averageRent: averageRentForType,
      };
    }).sort((a, b) => b.count - a.count);
    
    const analytics: ComprehensiveAnalytics = {
      genderAnalytics,
      tenantTypeAnalytics: {
        individual: tenantTypeCounts.individual,
        family: tenantTypeCounts.family,
        couple: tenantTypeCounts.couple,
        group: tenantTypeCounts.group,
        totalPeople,
      },
      ownerAnalytics: {
        totalOwners: ownerGenderCounts.total,
        maleOwners: ownerGenderCounts.male,
        femaleOwners: ownerGenderCounts.female,
        unknownOwners: ownerGenderCounts.unknown,
        maleOwnerPercentage,
        femaleOwnerPercentage,
        averagePropertiesPerOwner,
        topOwners,
      },
      totalProperties,
      availableProperties,
      occupiedProperties,
      reservedProperties,
      averageRent: Math.round(averageRent),
      propertyTypes,
      totalBookings,
      approvedBookings,
      pendingBookings,
      rejectedBookings,
      cancelledBookings,
      completedBookings,
      bookingTrends: {
        thisMonth: thisMonthBookings,
        lastMonth: lastMonthBookings,
        growthRate
      },
      paymentMethods,
      totalInquiries,
      totalViews,
      averageViewsPerProperty: Math.round(averageViewsPerProperty),
      recentActivity: {
        newBookings: recentBookings,
        newProperties: recentProperties,
        newInquiries: recentInquiries,
        newOwners: recentOwners,
        newTenants: recentTenants,
      },
      relationshipAnalytics: {
        averageBookingsPerOwner,
        averageBookingsPerTenant,
        mostActiveOwners,
        mostActiveTenants,
        conversionRate,
      },
      marketAnalytics: {
        occupancyRate,
        averageDaysOnMarket,
        priceRange,
        popularPropertyTypes,
      },
    };
    
    console.log('📊 Comprehensive Analytics:', analytics);
    
    // Ensure we never return null/undefined
    if (!analytics) {
      console.error('❌ Analytics object is null/undefined, creating empty analytics');
      throw new Error('Analytics object creation failed');
    }
    
    return analytics;
    
  } catch (error) {
    console.error('❌ Error getting comprehensive analytics:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // ALWAYS return empty analytics on error (never null/undefined)
    const emptyAnalytics: ComprehensiveAnalytics = {
      genderAnalytics: {
        total: 0,
        male: 0,
        female: 0,
        unknown: 0,
        malePercentage: 0,
        femalePercentage: 0,
      },
      tenantTypeAnalytics: {
        individual: 0,
        family: 0,
        couple: 0,
        group: 0,
        totalPeople: 0,
      },
      ownerAnalytics: {
        totalOwners: 0,
        maleOwners: 0,
        femaleOwners: 0,
        unknownOwners: 0,
        maleOwnerPercentage: 0,
        femaleOwnerPercentage: 0,
        averagePropertiesPerOwner: 0,
        topOwners: [],
      },
      totalProperties: 0,
      availableProperties: 0,
      occupiedProperties: 0,
      reservedProperties: 0,
      averageRent: 0,
      propertyTypes: {},
      totalBookings: 0,
      approvedBookings: 0,
      pendingBookings: 0,
      rejectedBookings: 0,
      cancelledBookings: 0,
      completedBookings: 0,
      bookingTrends: {
        thisMonth: 0,
        lastMonth: 0,
        growthRate: 0,
      },
      paymentMethods: {},
      totalInquiries: 0,
      totalViews: 0,
      averageViewsPerProperty: 0,
      recentActivity: {
        newBookings: 0,
        newProperties: 0,
        newInquiries: 0,
        newOwners: 0,
        newTenants: 0,
      },
      relationshipAnalytics: {
        averageBookingsPerOwner: 0,
        averageBookingsPerTenant: 0,
        mostActiveOwners: [],
        mostActiveTenants: [],
        conversionRate: 0,
      },
      marketAnalytics: {
        occupancyRate: 0,
        averageDaysOnMarket: 0,
        priceRange: { min: 0, max: 0, median: 0 },
        popularPropertyTypes: [],
      },
    };
    
    // Double-check: ensure we never return null
    console.log('✅ Returning empty analytics (guaranteed non-null)');
    return emptyAnalytics;
  }
}

/**
 * Get detailed tenant list with approved bookings in a barangay
 */
export async function getTenantDetailsByBarangay(barangay: string): Promise<Array<{
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  gender: 'male' | 'female' | undefined;
  propertyTitle: string;
  approvedDate: string;
}>> {
  try {
    console.log('📋 Getting tenant details for barangay:', barangay);
    
    // Get all approved bookings
    const allBookings = await db.list<BookingRecord>('bookings');
    const approvedBookings = allBookings.filter(
      booking => booking.status === 'approved'
    );
    
    // Filter to only include bookings with paid payment status
    // Only count tenants with completed payments as residents
    const paidApprovedBookings = approvedBookings.filter(
      booking => booking.paymentStatus === 'paid'
    );
    
    // Get all published listings in this barangay (match dashboard logic)
    const allListings = await db.list('published_listings');
    const allUsers = await db.list<DbUserRecord>('users');
    
    const barangayListings = allListings.filter(listing => {
      // Check barangay match
      let isInBarangay = false;
      if (listing.barangay) {
        const listingBarangay = listing.barangay.trim().toUpperCase();
        const targetBarangay = barangay.trim().toUpperCase();
        console.log(`🔍 Tenant Details: Comparing listing barangay "${listingBarangay}" with target "${targetBarangay}"`);
        isInBarangay = listingBarangay === targetBarangay;
      } else {
        // Fallback: if barangay field not set, check via user
        const listingUser = allUsers.find(u => u.id === listing.userId);
        const userBarangay = listingUser?.barangay;
        if (userBarangay) {
          isInBarangay = userBarangay.trim().toUpperCase() === barangay.trim().toUpperCase();
        }
      }
      
      return isInBarangay;
    });
    
    // Get property IDs for this barangay
    const barangayPropertyIds = barangayListings.map(listing => listing.id);
    
    // Filter bookings for properties in this barangay with paid payment status
    const barangayBookings = paidApprovedBookings.filter(
      booking => barangayPropertyIds.includes(booking.propertyId)
    );
    
    // Get all users (already fetched above)
    
    // Map bookings to tenant details
    const tenantDetails = barangayBookings.map(booking => {
      const tenantUser = allUsers.find(user => user.id === booking.tenantId);
      
      return {
        tenantId: booking.tenantId,
        tenantName: booking.tenantName,
        tenantEmail: booking.tenantEmail,
        gender: tenantUser?.gender,
        propertyTitle: booking.propertyTitle,
        approvedDate: booking.approvedAt || booking.createdAt,
      };
    });
    
    console.log(`✅ Found ${tenantDetails.length} tenant details`);
    
    return tenantDetails;
    
  } catch (error) {
    console.error('❌ Error getting tenant details:', error);
    return [];
  }
}

/**
 * Export comprehensive analytics data for barangay officials
 */
export async function exportBarangayAnalytics(barangay: string): Promise<{
  summary: string;
  csvData: string;
  jsonData: any;
}> {
  try {
    console.log('📊 Exporting analytics for barangay:', barangay);
    
    const analytics = await getComprehensiveAnalytics(barangay);
    const tenantDetails = await getTenantDetailsByBarangay(barangay);
    
    // Generate summary report
    const summary = `
BARANGAY ANALYTICS REPORT
========================
Barangay: ${barangay}
Generated: ${new Date().toLocaleString()}

OVERVIEW
--------
Total Properties: ${analytics.totalProperties}
Total Bookings: ${analytics.totalBookings}
Total Views: ${analytics.totalViews}

OWNER DEMOGRAPHICS
------------------
Total Owners: ${analytics.ownerAnalytics.totalOwners}
Male Owners: ${analytics.ownerAnalytics.maleOwners} (${analytics.ownerAnalytics.maleOwnerPercentage}%)
Female Owners: ${analytics.ownerAnalytics.femaleOwners} (${analytics.ownerAnalytics.femaleOwnerPercentage}%)
Average Properties per Owner: ${analytics.ownerAnalytics.averagePropertiesPerOwner}

TENANT DEMOGRAPHICS
-------------------
Total Tenants: ${analytics.genderAnalytics.total}
Male Tenants: ${analytics.genderAnalytics.male} (${analytics.genderAnalytics.malePercentage}%)
Female Tenants: ${analytics.genderAnalytics.female} (${analytics.genderAnalytics.femalePercentage}%)

TENANT TYPE DISTRIBUTION
------------------------
Total People: ${analytics.tenantTypeAnalytics.totalPeople}
Individual: ${analytics.tenantTypeAnalytics.individual} bookings
Family: ${analytics.tenantTypeAnalytics.family} bookings
Couple: ${analytics.tenantTypeAnalytics.couple} bookings
Group/Shared: ${analytics.tenantTypeAnalytics.group} bookings

PROPERTY STATUS
--------------
Available: ${analytics.availableProperties} (${Math.round((analytics.availableProperties / analytics.totalProperties) * 100)}%)
Occupied: ${analytics.occupiedProperties} (${Math.round((analytics.occupiedProperties / analytics.totalProperties) * 100)}%)
Reserved: ${analytics.reservedProperties} (${Math.round((analytics.reservedProperties / analytics.totalProperties) * 100)}%)

BOOKING STATUS
--------------
Approved: ${analytics.approvedBookings}
Pending: ${analytics.pendingBookings}
Rejected: ${analytics.rejectedBookings}
Cancelled: ${analytics.cancelledBookings}
Completed: ${analytics.completedBookings}

MARKET ANALYTICS
----------------
Occupancy Rate: ${analytics.marketAnalytics.occupancyRate}%
Average Days on Market: ${analytics.marketAnalytics.averageDaysOnMarket} days
Price Range: ₱${analytics.marketAnalytics.priceRange.min.toLocaleString()} - ₱${analytics.marketAnalytics.priceRange.max.toLocaleString()}
Median Price: ₱${analytics.marketAnalytics.priceRange.median.toLocaleString()}

RECENT ACTIVITY (Last 7 Days)
-----------------------------
New Bookings: ${analytics.recentActivity.newBookings}
New Properties: ${analytics.recentActivity.newProperties}
New Owners: ${analytics.recentActivity.newOwners}
New Tenants: ${analytics.recentActivity.newTenants}
New Inquiries: ${analytics.recentActivity.newInquiries}

TOP PERFORMING OWNERS
--------------------
${analytics.ownerAnalytics.topOwners.map((owner, index) => 
  `${index + 1}. ${owner.ownerName} - ${owner.propertyCount} properties - ₱${owner.totalRevenue.toLocaleString()}`
).join('\n')}

MOST ACTIVE OWNERS
------------------
${analytics.relationshipAnalytics.mostActiveOwners.map((owner, index) => 
  `${index + 1}. ${owner.ownerName} - ${owner.bookingCount} bookings - ₱${owner.revenue.toLocaleString()}`
).join('\n')}

MOST ACTIVE TENANTS
-------------------
${analytics.relationshipAnalytics.mostActiveTenants.map((tenant, index) => 
  `${index + 1}. ${tenant.tenantName} - ${tenant.bookingCount} bookings`
).join('\n')}

POPULAR PROPERTY TYPES
----------------------
${analytics.marketAnalytics.popularPropertyTypes.map(type => 
  `${type.type}: ${type.count} properties - Avg Rent: ₱${type.averageRent.toLocaleString()}`
).join('\n')}
`;

    // Generate CSV data
    const csvHeaders = [
      'Type', 'Category', 'Metric', 'Value', 'Percentage'
    ];
    
    const csvRows = [
      ['Property', 'Total', 'Properties', analytics.totalProperties.toString(), '100%'],
      ['Property', 'Status', 'Available', analytics.availableProperties.toString(), `${Math.round((analytics.availableProperties / analytics.totalProperties) * 100)}%`],
      ['Property', 'Status', 'Occupied', analytics.occupiedProperties.toString(), `${Math.round((analytics.occupiedProperties / analytics.totalProperties) * 100)}%`],
      ['Property', 'Status', 'Reserved', analytics.reservedProperties.toString(), `${Math.round((analytics.reservedProperties / analytics.totalProperties) * 100)}%`],
      ['Owner', 'Demographics', 'Total Owners', analytics.ownerAnalytics.totalOwners.toString(), '100%'],
      ['Owner', 'Demographics', 'Male Owners', analytics.ownerAnalytics.maleOwners.toString(), `${analytics.ownerAnalytics.maleOwnerPercentage}%`],
      ['Owner', 'Demographics', 'Female Owners', analytics.ownerAnalytics.femaleOwners.toString(), `${analytics.ownerAnalytics.femaleOwnerPercentage}%`],
      ['Tenant', 'Demographics', 'Total Tenants', analytics.genderAnalytics.total.toString(), '100%'],
      ['Tenant', 'Demographics', 'Male Tenants', analytics.genderAnalytics.male.toString(), `${analytics.genderAnalytics.malePercentage}%`],
      ['Tenant', 'Demographics', 'Female Tenants', analytics.genderAnalytics.female.toString(), `${analytics.genderAnalytics.femalePercentage}%`],
      ['Booking', 'Status', 'Approved', analytics.approvedBookings.toString(), `${Math.round((analytics.approvedBookings / analytics.totalBookings) * 100)}%`],
      ['Booking', 'Status', 'Pending', analytics.pendingBookings.toString(), `${Math.round((analytics.pendingBookings / analytics.totalBookings) * 100)}%`],
      ['Market', 'Analytics', 'Occupancy Rate', `${analytics.marketAnalytics.occupancyRate}%`, ''],
      ['Market', 'Analytics', 'Average Days on Market', `${analytics.marketAnalytics.averageDaysOnMarket} days`, ''],
      ['Activity', 'Recent', 'New Bookings (7 days)', analytics.recentActivity.newBookings.toString(), ''],
      ['Activity', 'Recent', 'New Properties (7 days)', analytics.recentActivity.newProperties.toString(), ''],
      ['Activity', 'Recent', 'New Owners (7 days)', analytics.recentActivity.newOwners.toString(), ''],
      ['Activity', 'Recent', 'New Tenants (7 days)', analytics.recentActivity.newTenants.toString(), ''],
    ];
    
    const csvData = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Generate JSON data
    const jsonData = {
      barangay,
      generatedAt: new Date().toISOString(),
      analytics,
      tenantDetails,
      exportMetadata: {
        totalRecords: analytics.totalProperties + analytics.totalBookings + analytics.ownerAnalytics.totalOwners + analytics.genderAnalytics.total,
        dataTypes: ['properties', 'bookings', 'owners', 'tenants', 'analytics'],
        version: '1.0'
      }
    };

    console.log('✅ Analytics export completed');
    
    return {
      summary,
      csvData,
      jsonData
    };
    
  } catch (error) {
    console.error('❌ Error exporting analytics:', error);
    throw error;
  }
}
