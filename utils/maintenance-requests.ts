import { db, generateId } from './db';
import { MaintenanceRequestRecord } from '../types';

/**
 * Create a new maintenance request
 */
export async function createMaintenanceRequest(data: {
  bookingId: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  title: string;
  description: string;
  category: MaintenanceRequestRecord['category'];
  priority: MaintenanceRequestRecord['priority'];
  photos?: string[];
  videos?: string[];
}): Promise<MaintenanceRequestRecord> {
  try {
    const request: MaintenanceRequestRecord = {
      id: generateId('maintenance'),
      bookingId: data.bookingId,
      propertyId: data.propertyId,
      tenantId: data.tenantId,
      ownerId: data.ownerId,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: 'pending',
      photos: data.photos || [],
      videos: data.videos || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('maintenance_requests', request.id, request);
    console.log('✅ Created maintenance request:', request.id);
    
    // Dispatch event to notify owner
    try {
      const { dispatchCustomEvent } = await import('./custom-events');
      dispatchCustomEvent('maintenanceRequestCreated', {
        requestId: request.id,
        propertyId: request.propertyId,
        ownerId: request.ownerId,
        tenantId: request.tenantId,
        title: request.title,
        priority: request.priority,
        status: request.status,
        timestamp: request.createdAt
      });
    } catch (error) {
      console.warn('⚠️ Could not dispatch maintenance request event:', error);
    }
    
    return request;
  } catch (error) {
    console.error('❌ Error creating maintenance request:', error);
    throw error;
  }
}

/**
 * Get all maintenance requests for a tenant
 */
export async function getMaintenanceRequestsByTenant(tenantId: string): Promise<MaintenanceRequestRecord[]> {
  try {
    const allRequests = await db.list<MaintenanceRequestRecord>('maintenance_requests');
    return allRequests.filter(request => request.tenantId === tenantId);
  } catch (error) {
    console.error('❌ Error getting maintenance requests:', error);
    return [];
  }
}

/**
 * Get maintenance requests for a booking
 */
export async function getMaintenanceRequestsByBooking(bookingId: string): Promise<MaintenanceRequestRecord[]> {
  try {
    const allRequests = await db.list<MaintenanceRequestRecord>('maintenance_requests');
    return allRequests.filter(request => request.bookingId === bookingId);
  } catch (error) {
    console.error('❌ Error getting maintenance requests:', error);
    return [];
  }
}

/**
 * Get pending maintenance requests count for a tenant
 */
export async function getPendingMaintenanceRequestsCount(tenantId: string): Promise<number> {
  try {
    const requests = await getMaintenanceRequestsByTenant(tenantId);
    return requests.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
  } catch (error) {
    console.error('❌ Error getting pending maintenance requests count:', error);
    return 0;
  }
}

/**
 * Get all maintenance requests for an owner
 */
export async function getMaintenanceRequestsByOwner(ownerId: string): Promise<MaintenanceRequestRecord[]> {
  try {
    const allRequests = await db.list<MaintenanceRequestRecord>('maintenance_requests');
    return allRequests.filter(request => request.ownerId === ownerId);
  } catch (error) {
    console.error('❌ Error getting maintenance requests:', error);
    return [];
  }
}

/**
 * Get pending maintenance requests count for an owner
 */
export async function getPendingMaintenanceRequestsCountForOwner(ownerId: string): Promise<number> {
  try {
    const requests = await getMaintenanceRequestsByOwner(ownerId);
    return requests.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
  } catch (error) {
    console.error('❌ Error getting pending maintenance requests count:', error);
    return 0;
  }
}

/**
 * Update maintenance request status
 */
export async function updateMaintenanceRequestStatus(
  requestId: string,
  status: MaintenanceRequestRecord['status'],
  ownerNotes?: string
): Promise<boolean> {
  try {
    const request = await db.get<MaintenanceRequestRecord>('maintenance_requests', requestId);
    if (!request) {
      throw new Error('Maintenance request not found');
    }

    const updated: MaintenanceRequestRecord = {
      ...request,
      status,
      ownerNotes: ownerNotes !== undefined ? ownerNotes : request.ownerNotes,
      resolvedAt: status === 'resolved' ? new Date().toISOString() : request.resolvedAt,
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('maintenance_requests', requestId, updated);
    console.log('✅ Updated maintenance request:', requestId, 'to status:', status);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating maintenance request:', error);
    throw error;
  }
}

/**
 * Cancel a maintenance request (tenant only)
 */
export async function cancelMaintenanceRequest(
  requestId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const request = await db.get<MaintenanceRequestRecord>('maintenance_requests', requestId);
    if (!request) {
      throw new Error('Maintenance request not found');
    }

    if (request.tenantId !== tenantId) {
      throw new Error('Unauthorized: Only the tenant who created the request can cancel it');
    }

    if (request.status === 'resolved' || request.status === 'cancelled') {
      throw new Error(`Cannot cancel a request that is already ${request.status}`);
    }

    const updated: MaintenanceRequestRecord = {
      ...request,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('maintenance_requests', requestId, updated);
    console.log('✅ Cancelled maintenance request:', requestId);
    
    return true;
  } catch (error) {
    console.error('❌ Error cancelling maintenance request:', error);
    throw error;
  }
}

