/**
 * Media Persistence Test Button
 * Add this component to any screen to quickly test media persistence
 * 
 * Usage:
 * import MediaPersistenceTestButton from '@/components/MediaPersistenceTestButton';
 * 
 * <MediaPersistenceTestButton />
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { testMediaPersistence } from '@/utils/test-media-persistence';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

export default function MediaPersistenceTestButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTest = async () => {
    setIsRunning(true);
    setShowResults(true);
    
    try {
      console.log('🧪 Running media persistence test...');
      const testResults = await testMediaPersistence();
      setResults(testResults);
      console.log('✅ Test completed');
    } catch (error) {
      console.error('❌ Test failed:', error);
      setResults({
        passed: 0,
        failed: 1,
        total: 1,
        details: [{
          name: 'Test Execution',
          passed: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }]
      });
    } finally {
      setIsRunning(false);
    }
  };

  const passRate = results && results.total > 0 
    ? Math.round((results.passed / results.total) * 100) 
    : 0;

  return (
    <>
      {/* Test Button */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={runTest}
        disabled={isRunning}
      >
        {isRunning ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <AlertCircle size={16} color="white" />
            <Text style={styles.testButtonText}>Test Media Persistence</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Results Modal */}
      <Modal
        visible={showResults}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Media Persistence Test Results</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowResults(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Summary */}
            {results && (
              <View style={styles.summary}>
                <View style={[
                  styles.summaryCard,
                  passRate === 100 ? styles.summarySuccess : 
                  passRate >= 70 ? styles.summaryWarning : 
                  styles.summaryError
                ]}>
                  <Text style={styles.summaryTitle}>
                    {passRate === 100 ? '🎉 All Tests Passed!' :
                     passRate >= 70 ? '⚠️ Most Tests Passed' :
                     '❌ Tests Failed'}
                  </Text>
                  <Text style={styles.summaryText}>
                    Pass Rate: {passRate}% ({results.passed}/{results.total})
                  </Text>
                </View>
              </View>
            )}

            {/* Test Details */}
            {results && results.details && (
              <ScrollView style={styles.detailsContainer}>
                {results.details.map((detail: any, index: number) => (
                  <View 
                    key={index}
                    style={[
                      styles.detailCard,
                      detail.passed ? styles.detailCardSuccess : styles.detailCardError
                    ]}
                  >
                    <View style={styles.detailHeader}>
                      {detail.passed ? (
                        <CheckCircle size={20} color="#10B981" />
                      ) : (
                        <XCircle size={20} color="#EF4444" />
                      )}
                      <Text style={styles.detailName}>{detail.name}</Text>
                    </View>
                    <Text style={styles.detailMessage}>{detail.message}</Text>
                    {detail.data && (
                      <View style={styles.detailData}>
                        <Text style={styles.detailDataText}>
                          {JSON.stringify(detail.data, null, 2)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.runAgainButton]}
                onPress={runTest}
                disabled={isRunning}
              >
                {isRunning ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionButtonText}>Run Test Again</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.closeActionButton]}
                onPress={() => setShowResults(false)}
              >
                <Text style={styles.actionButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
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
    borderRadius: 20,
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  summary: {
    padding: 20,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summarySuccess: {
    backgroundColor: '#D1FAE5',
  },
  summaryWarning: {
    backgroundColor: '#FEF3C7',
  },
  summaryError: {
    backgroundColor: '#FEE2E2',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsContainer: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  detailCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  detailCardSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  detailCardError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  detailMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  detailData: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  detailDataText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runAgainButton: {
    backgroundColor: '#8B5CF6',
  },
  closeActionButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

