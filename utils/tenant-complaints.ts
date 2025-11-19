import { db, generateId } from './db';
import { TenantComplaintRecord, PublishedListingRecord, BookingRecord, DbUserRecord } from '../types';

/**
 * Create a new tenant complaint
 */
export async function createTenantComplaint(data: {
  tenantId: string;
  propertyId: string;
  bookingId?: string;
  category: TenantComplaintRecord['category'];
  description: string;
  photos?: string[];
  videos?: string[];
  isAnonymous: boolean;
  urgency?: TenantComplaintRecord['urgency'];
}): Promise<TenantComplaintRecord> {
  try {
    const complaint: TenantComplaintRecord = {
      id: generateId('complaint'),
      tenantId: data.tenantId,
      propertyId: data.propertyId,
      bookingId: data.bookingId,
      category: data.category,
      description: data.description,
      photos: data.photos || [],
      videos: data.videos || [],
      isAnonymous: data.isAnonymous,
      status: 'submitted',
      urgency: data.urgency || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('tenant_complaints', complaint.id, complaint);
    console.log('✅ Created tenant complaint:', complaint.id);
    
    return complaint;
  } catch (error) {
    console.error('❌ Error creating tenant complaint:', error);
    throw error;
  }
}

/**
 * Get all complaints for a tenant
 */
export async function getComplaintsByTenant(tenantId: string): Promise<TenantComplaintRecord[]> {
  try {
    const allComplaints = await db.list<TenantComplaintRecord>('tenant_complaints');
    return allComplaints
      .filter(complaint => complaint.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('❌ Error getting tenant complaints:', error);
    return [];
  }
}

/**
 * Get all complaints for a barangay (filtered by property barangay)
 */
export async function getComplaintsByBarangay(barangayName: string): Promise<TenantComplaintRecord[]> {
  try {
    const allComplaints = await db.list<TenantComplaintRecord>('tenant_complaints');
    const allProperties = await db.list<PublishedListingRecord>('published_listings');
    const allUsers = await db.list<DbUserRecord>('users');
    
    // Filter complaints by property's barangay
    const complaintsInBarangay = allComplaints.filter(complaint => {
      const property = allProperties.find(p => p.id === complaint.propertyId);
      if (!property) return false;
      
      // Check property's barangay field
      if (property.barangay) {
        return property.barangay.trim().toUpperCase() === barangayName.trim().toUpperCase();
      }
      
      // Fallback: check via property user
      const propertyUser = allUsers.find(u => u.id === property.userId);
      const userBarangay = propertyUser?.barangay;
      if (userBarangay) {
        return userBarangay.trim().toUpperCase() === barangayName.trim().toUpperCase();
      }
      
      return false;
    });
    
    return complaintsInBarangay.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('❌ Error getting barangay complaints:', error);
    return [];
  }
}

/**
 * Get complaint by ID
 */
export async function getComplaintById(complaintId: string): Promise<TenantComplaintRecord | null> {
  try {
    return await db.get<TenantComplaintRecord>('tenant_complaints', complaintId);
  } catch (error) {
    console.error('❌ Error getting complaint:', error);
    return null;
  }
}

/**
 * Update complaint status (for barangay officials)
 */
export async function updateComplaintStatus(
  complaintId: string,
  status: TenantComplaintRecord['status'],
  barangayNotes?: string
): Promise<boolean> {
  try {
    const complaint = await db.get<TenantComplaintRecord>('tenant_complaints', complaintId);
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    const updated: TenantComplaintRecord = {
      ...complaint,
      status,
      barangayNotes: barangayNotes !== undefined ? barangayNotes : complaint.barangayNotes,
      resolvedAt: status === 'resolved' ? new Date().toISOString() : complaint.resolvedAt,
      closedAt: status === 'closed' ? new Date().toISOString() : complaint.closedAt,
      updatedAt: new Date().toISOString(),
    };

    // Auto-update status to 'received_by_brgy' if it's still 'submitted'
    if (status !== 'submitted' && complaint.status === 'submitted') {
      updated.status = 'received_by_brgy';
    }

    await db.upsert('tenant_complaints', complaintId, updated);
    console.log('✅ Updated complaint:', complaintId, 'to status:', updated.status);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating complaint:', error);
    throw error;
  }
}

/**
 * Add settlement documents to a complaint (for barangay officials)
 */
export async function addSettlementDocuments(
  complaintId: string,
  documentUris: string[]
): Promise<boolean> {
  try {
    const complaint = await db.get<TenantComplaintRecord>('tenant_complaints', complaintId);
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    const updated: TenantComplaintRecord = {
      ...complaint,
      settlementDocuments: [...(complaint.settlementDocuments || []), ...documentUris],
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('tenant_complaints', complaintId, updated);
    console.log('✅ Added settlement documents to complaint:', complaintId);
    
    return true;
  } catch (error) {
    console.error('❌ Error adding settlement documents:', error);
    throw error;
  }
}

/**
 * Get new complaints count for barangay (status = 'submitted')
 */
export async function getNewComplaintsCount(barangayName: string): Promise<number> {
  try {
    const complaints = await getComplaintsByBarangay(barangayName);
    return complaints.filter(c => c.status === 'submitted').length;
  } catch (error) {
    console.error('❌ Error getting new complaints count:', error);
    return 0;
  }
}

/**
 * Get complaint with full details (including tenant and property info)
 */
export async function getComplaintWithDetails(complaintId: string): Promise<{
  complaint: TenantComplaintRecord;
  tenant?: DbUserRecord;
  property?: PublishedListingRecord;
  booking?: BookingRecord;
} | null> {
  try {
    const complaint = await getComplaintById(complaintId);
    if (!complaint) return null;

    const tenant = await db.get<DbUserRecord>('users', complaint.tenantId);
    const property = await db.get<PublishedListingRecord>('published_listings', complaint.propertyId);
    const booking = complaint.bookingId 
      ? await db.get<BookingRecord>('bookings', complaint.bookingId)
      : undefined;

    return {
      complaint,
      tenant: tenant || undefined,
      property: property || undefined,
      booking: booking || undefined,
    };
  } catch (error) {
    console.error('❌ Error getting complaint details:', error);
    return null;
  }
}

/**
 * Get complaint category label
 */
export function getComplaintCategoryLabel(category: TenantComplaintRecord['category']): string {
  const labels: Record<TenantComplaintRecord['category'], string> = {
    noise_complaint: 'Noise Complaint',
    landlord_abuse: 'Landlord Abuse / Harassment',
    unsanitary_conditions: 'Unsanitary Living Conditions',
    illegal_activities: 'Illegal Activities',
    maintenance_neglect: 'Maintenance Neglect',
    payment_dispute: 'Payment Dispute',
    safety_concern: 'Safety Concern',
    neighbor_conflict: 'Neighbor Conflict',
  };
  return labels[category] || category;
}

/**
 * Get status label
 */
export function getStatusLabel(status: TenantComplaintRecord['status']): string {
  const labels: Record<TenantComplaintRecord['status'], string> = {
    submitted: 'Submitted',
    received_by_brgy: 'Received by Brgy',
    under_review: 'Under Review',
    for_mediation: 'For Mediation',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return labels[status] || status;
}

/**
 * Get urgency color
 */
export function getUrgencyColor(urgency: TenantComplaintRecord['urgency']): string {
  const colors: Record<TenantComplaintRecord['urgency'], string> = {
    low: '#6B7280',
    medium: '#F59E0B',
    high: '#EF4444',
    urgent: '#DC2626',
  };
  return colors[urgency] || '#6B7280';
}

