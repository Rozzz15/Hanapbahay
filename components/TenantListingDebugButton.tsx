/**
 * Debug Button for Tenant Dashboard
 * Add this to tenant dashboard to quickly diagnose why listings aren't showing
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Modal, ScrollView } from 'react-native';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { db } from '@/utils/db';

export default function TenantListingDebugButton() {
  const [showModal, setShowModal] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostic = async () => {
    try {
      const allListings = await db.list('published_listings');
      
      const analysis = allListings.map((listing: any) => {
        const hasId = !!listing.id;
        const hasStatus = !!listing.status;
        const isPublished = listing.status?.toLowerCase() === 'published';
        const isValid = hasId && isPublished;
        
        return {
          id: listing.id,
          propertyType: listing.propertyType,
          address: listing.address?.substring(0, 40),
          status: listing.status,
          ownerName: listing.ownerName,
          monthlyRent: listing.monthlyRent,
          hasId,
          hasStatus,
          isPublished,
          isValid,
          reason: !hasId ? 'Missing ID' : !isPublished ? `Status is "${listing.status}"` : 'Valid'
        };
      });
      
      const validCount = analysis.filter(a => a.isValid).length;
      const invalidCount = analysis.length - validCount;
      
      setResults({
        total: allListings.length,
        valid: validCount,
        invalid: invalidCount,
        listings: analysis
      });
      
      setShowModal(true);
    } catch (error) {
      console.error('Diagnostic failed:', error);
      setResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        total: 0,
        valid: 0,
        invalid: 0,
        listings: []
      });
      setShowModal(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.debugButton}
        onPress={runDiagnostic}
      >
        <AlertCircle size={16} color="white" />
        <Text style={styles.debugButtonText}>Debug Listings</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Listing Diagnostic</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {results && (
              <ScrollView style={styles.scrollContent}>
                {results.error ? (
                  <View style={styles.errorBox}>
                    <XCircle size={24} color="#EF4444" />
                    <Text style={styles.errorText}>{results.error}</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.summary}>
                      <Text style={styles.summaryTitle}>Summary</Text>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Listings:</Text>
                        <Text style={styles.summaryValue}>{results.total}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Valid (Will Show):</Text>
                        <Text style={[styles.summaryValue, styles.successText]}>
                          {results.valid} ✅
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Invalid (Hidden):</Text>
                        <Text style={[styles.summaryValue, styles.errorTextColor]}>
                          {results.invalid} ❌
                        </Text>
                      </View>
                    </View>

                    {results.total === 0 && (
                      <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>No Listings Found</Text>
                        <Text style={styles.warningText}>
                          1. Login as an owner{'\n'}
                          2. Create a new listing{'\n'}
                          3. Add photos and details{'\n'}
                          4. Submit the listing{'\n'}
                          5. Login as tenant to see it
                        </Text>
                      </View>
                    )}

                    {results.invalid > 0 && (
                      <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>Some Listings Are Invalid</Text>
                        <Text style={styles.warningText}>
                          Check the listings below marked with ❌
                        </Text>
                      </View>
                    )}

                    <View style={styles.listingsSection}>
                      <Text style={styles.sectionTitle}>Listings Details:</Text>
                      {results.listings.map((listing: any, index: number) => (
                        <View
                          key={index}
                          style={[
                            styles.listingCard,
                            listing.isValid ? styles.validCard : styles.invalidCard
                          ]}
                        >
                          <View style={styles.listingHeader}>
                            {listing.isValid ? (
                              <CheckCircle size={20} color="#10B981" />
                            ) : (
                              <XCircle size={20} color="#EF4444" />
                            )}
                            <Text style={styles.listingTitle}>
                              {listing.propertyType || 'Unknown'}
                            </Text>
                          </View>
                          <Text style={styles.listingDetail}>ID: {listing.id}</Text>
                          <Text style={styles.listingDetail}>
                            Status: {listing.status || 'MISSING'}
                          </Text>
                          <Text style={styles.listingDetail}>
                            Owner: {listing.ownerName || 'Unknown'}
                          </Text>
                          <Text style={styles.listingDetail}>
                            Price: ₱{listing.monthlyRent?.toLocaleString() || 'N/A'}
                          </Text>
                          {!listing.isValid && (
                            <View style={styles.reasonBox}>
                              <Text style={styles.reasonText}>❌ {listing.reason}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeActionButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeActionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  scrollContent: {
    maxHeight: 500,
  },
  summary: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  successText: {
    color: '#10B981',
  },
  errorTextColor: {
    color: '#EF4444',
  },
  warningBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  errorBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
  },
  listingsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  listingCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 2,
  },
  validCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  invalidCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  listingDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  reasonBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  closeActionButton: {
    margin: 16,
    padding: 14,
    backgroundColor: '#6B7280',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeActionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

