/**
 * Temporary component to seed default owners
 * 
 * Usage: Add this component temporarily to any screen to run the seed
 * 
 * Example:
 * import SeedOwnersButton from '@/components/SeedOwnersButton';
 * 
 * // In your component
 * <SeedOwnersButton />
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { seedDefaultOwners } from '@/utils/seed-default-owners';
import { printOwnerCredentials, getOwnerCredentialsJSON } from '@/utils/print-owner-credentials';
import { verifySeededOwners, listAllUsersInMockAuth } from '@/utils/verify-seeded-owners';
import { diagnoseSeedIssues } from '@/utils/diagnose-seed-issues';
import { verifyAllAccounts } from '@/utils/verify-all-accounts';
import { fixPropertiesAvailability } from '@/utils/fix-properties-availability';
import { verifyPropertiesVisible } from '@/utils/verify-properties-visible';
import { testDataPersistence } from '@/utils/test-data-persistence';
import { forceSaveAllProperties } from '@/utils/force-save-properties';
import { diagnoseMissingProperties } from '@/utils/diagnose-missing-properties';
import { clearAllSeedData, clearAllData } from '@/utils/clear-seed-data';
import { clearCache } from '@/utils/db';

export default function SeedOwnersButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      setResult(null);
      setShowCredentials(false);
      
      console.log('🌱 Starting seed process...');
      
      // Test data persistence first
      console.log('🧪 Testing data persistence...');
      const persistenceTest = await testDataPersistence();
      if (!persistenceTest.success) {
        Alert.alert(
          'Data Persistence Issue',
          `Cannot save data properly:\n${persistenceTest.errors.join('\n')}\n\nPlease check AsyncStorage is working.`,
          [{ text: 'OK' }]
        );
        return;
      }
      console.log('✅ Data persistence test passed');
      
      // Clear cache first to ensure fresh data
      console.log('🗑️ Clearing database cache...');
      await clearCache();
      
      const seedResult = await seedDefaultOwners();
      
      setResult(seedResult);
      
      // Clear cache again after seeding
      await clearCache();
      
      // Fix properties availability status to ensure they show up
      console.log('🔧 Fixing properties availability...');
      const fixResult = await fixPropertiesAvailability();
      console.log('Fix result:', fixResult);
      
      // Force save all properties to AsyncStorage to ensure persistence
      console.log('💾 Force saving all properties to AsyncStorage...');
      const forceSaveResult = await forceSaveAllProperties();
      console.log('Force save result:', forceSaveResult);
      
      // Clear cache again after force save
      await clearCache();
      
      // Run comprehensive diagnostic
      console.log('🔍 Running comprehensive diagnostic...');
      const diagnostic = await diagnoseMissingProperties();
      console.log('Diagnostic result:', diagnostic);
      
      // Verify properties are visible
      console.log('🔍 Verifying properties visibility...');
      const visibilityCheck = await verifyPropertiesVisible();
      console.log('Visibility check:', visibilityCheck);
      
      if (seedResult.success) {
        // Run full diagnosis
        console.log('🔍 Running full diagnosis...');
        const diagnosis = await diagnoseSeedIssues();
        console.log('📊 Diagnosis result:', diagnosis);
        
        // Verify owners can log in
        console.log('🔍 Verifying seeded owners...');
        const verification = await verifySeededOwners();
        console.log('📊 Verification result:', verification);
        
        let message = `Created ${seedResult.totalOwners} owners and ${seedResult.totalProperties} properties.\n\n`;
        message += `Database: ${diagnosis.dbOwners} owners, ${diagnosis.dbListings} listings\n`;
        message += `Mock Auth: ${diagnosis.mockAuthUsers} users\n`;
        message += `Can Login: ${diagnosis.canLogin ? '✅' : '❌'}\n\n`;
        message += `Properties Visibility:\n`;
        message += `  Total: ${visibilityCheck.totalProperties}\n`;
        message += `  Visible: ${visibilityCheck.visibleProperties} ✅\n`;
        message += `  Hidden: ${visibilityCheck.hiddenProperties} ❌\n`;
        if (fixResult.fixedProperties > 0 || fixResult.fixedStatus > 0) {
          message += `  Fixed: ${fixResult.fixedProperties} availability, ${fixResult.fixedStatus} status\n`;
        }
        message += `\n`;
        
        if (diagnosis.issues.length > 0) {
          message += `⚠️ Issues: ${diagnosis.issues.length}\n`;
          message += `Check console for details.`;
        } else {
          message += `✅ All checks passed!`;
        }
        
        Alert.alert('Seed Complete!', message, [{ text: 'OK' }]);
        printOwnerCredentials();
      } else {
        Alert.alert(
          'Seed Completed with Errors',
          `Created ${seedResult.totalOwners} owners, but encountered ${seedResult.errors.length} errors. Check console for details.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Seed error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleShowCredentials = () => {
    setShowCredentials(true);
    printOwnerCredentials();
  };

  const handleVerify = async () => {
    try {
      // Clear cache first
      await clearCache();
      
      // Verify all accounts (owners, tenants, barangay officials)
      const verification = await verifyAllAccounts();
      setVerification(verification);
      
      let message = `📊 ACCOUNT VERIFICATION:\n\n`;
      message += `Total Accounts: ${verification.summary.totalAccounts}\n`;
      message += `  - Owners: ${verification.owners.length}\n`;
      message += `  - Tenants: ${verification.tenants.length}\n`;
      message += `  - Barangay Officials: ${verification.barangayOfficials.length}\n\n`;
      message += `Can Login: ${verification.summary.canLogin} ✅\n`;
      message += `Cannot Login: ${verification.summary.cannotLogin} ❌\n\n`;
      
      // Owner summary
      const workingOwners = verification.owners.filter(o => o.canLogin && o.hasApprovedApplication && o.hasProperties > 0).length;
      message += `Working Owners: ${workingOwners}/${verification.owners.length}\n`;
      
      // Tenant summary
      const workingTenants = verification.tenants.filter(t => t.canLogin).length;
      message += `Working Tenants: ${workingTenants}/${verification.tenants.length}\n`;
      
      // Barangay summary
      const workingBrgy = verification.barangayOfficials.filter(b => b.canLogin).length;
      message += `Working Barangay: ${workingBrgy}/${verification.barangayOfficials.length}\n\n`;
      
      if (verification.summary.issues.length > 0) {
        message += `⚠️ ISSUES: ${verification.summary.issues.length}\n`;
        message += `Check console for details.`;
      } else {
        message += `✅ All accounts working!`;
      }
      
      Alert.alert('Verification Complete', message, [{ text: 'OK' }]);
      
      // Also list all users
      await listAllUsersInMockAuth();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const credentials = result?.owners || [];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isSeeding && styles.buttonDisabled]}
        onPress={handleSeed}
        disabled={isSeeding}
      >
        <Text style={styles.buttonText}>
          {isSeeding ? 'Seeding...' : 'Seed Default Owners'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.verifyButton]}
        onPress={handleVerify}
      >
        <Text style={styles.buttonText}>
          Verify All Accounts
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.diagnoseButton]}
        onPress={async () => {
          try {
            const diagnostic = await diagnoseMissingProperties();
            let message = `Diagnostic Results:\n\n`;
            message += `AsyncStorage: ${diagnostic.inAsyncStorage} properties\n`;
            message += `Database: ${diagnostic.inDatabase} properties\n`;
            message += `Can Read: ${diagnostic.canRead ? '✅' : '❌'}\n\n`;
            if (diagnostic.issues.length > 0) {
              message += `Issues:\n${diagnostic.issues.slice(0, 3).join('\n')}`;
            }
            Alert.alert('Diagnostic', message, [{ text: 'OK' }]);
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
          }
        }}
      >
        <Text style={styles.buttonText}>
          Diagnose Properties
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.clearButton]}
        onPress={async () => {
          Alert.alert(
            'Clear Seed Data',
            'This will remove all seeded owners, properties, and applications. Continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear Seed Data',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const result = await clearAllSeedData();
                    let message = `Cleared:\n\n`;
                    message += `Owners: ${result.removedOwners}\n`;
                    message += `Properties: ${result.removedProperties}\n`;
                    message += `Applications: ${result.removedApplications}\n`;
                    message += `Mock Auth: ${result.removedMockAuth}\n`;
                    if (result.errors.length > 0) {
                      message += `\nErrors: ${result.errors.length}`;
                    }
                    Alert.alert('Clear Complete', message, [{ text: 'OK' }]);
                  } catch (error) {
                    Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
                  }
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.buttonText}>
          Clear All Seed Data
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.nuclearButton]}
        onPress={async () => {
          Alert.alert(
            '⚠️ Clear ALL Data',
            'This will remove EVERYTHING from the app (all users, properties, bookings, etc.). This cannot be undone!\n\nAre you absolutely sure?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, Clear Everything',
                style: 'destructive',
                onPress: async () => {
                  Alert.alert(
                    'Final Confirmation',
                    'Last chance! This will delete ALL data. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Yes, Delete Everything',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const result = await clearAllData();
                            if (result.success) {
                              Alert.alert('Success', 'All data has been cleared. Please restart the app.', [{ text: 'OK' }]);
                            } else {
                              Alert.alert('Partial Success', `Cleared with ${result.errors.length} errors. Check console.`, [{ text: 'OK' }]);
                            }
                          } catch (error) {
                            Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
                          }
                        },
                      },
                    ]
                  );
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.buttonText}>
          ⚠️ Clear ALL Data (Nuclear)
        </Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Seed Result:</Text>
          <Text style={styles.resultText}>
            Success: {result.success ? '✅' : '❌'}
          </Text>
          <Text style={styles.resultText}>
            Owners Created: {result.totalOwners}
          </Text>
          <Text style={styles.resultText}>
            Properties Created: {result.totalProperties}
          </Text>
          {result.errors && result.errors.length > 0 && (
            <View style={styles.errorsContainer}>
              <Text style={styles.errorsTitle}>Errors:</Text>
              {result.errors.map((error: string, index: number) => (
                <Text key={index} style={styles.errorText}>
                  {index + 1}. {error}
                </Text>
              ))}
            </View>
          )}

          {result.success && credentials.length > 0 && (
            <TouchableOpacity
              style={styles.credentialsButton}
              onPress={handleShowCredentials}
            >
              <Text style={styles.credentialsButtonText}>
                {showCredentials ? 'Hide' : 'Show'} Credentials
              </Text>
            </TouchableOpacity>
          )}

          {showCredentials && credentials.length > 0 && (
            <ScrollView style={styles.credentialsContainer}>
              <Text style={styles.credentialsTitle}>Owner Credentials:</Text>
              {credentials.map((owner: any, index: number) => (
                <View key={index} style={styles.credentialItem}>
                  <Text style={styles.credentialName}>{owner.name}</Text>
                  <Text style={styles.credentialText}>Email: {owner.email}</Text>
                  <Text style={styles.credentialText}>Password: {owner.password}</Text>
                  <Text style={styles.credentialText}>Barangay: {owner.barangay}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
    marginTop: 10,
  },
  diagnoseButton: {
    backgroundColor: '#F59E0B',
    marginTop: 10,
  },
  clearButton: {
    backgroundColor: '#EF4444',
    marginTop: 10,
  },
  nuclearButton: {
    backgroundColor: '#DC2626',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
  },
  errorsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 5,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#c62828',
    marginBottom: 3,
  },
  credentialsButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    alignItems: 'center',
  },
  credentialsButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  credentialsContainer: {
    marginTop: 10,
    maxHeight: 400,
  },
  credentialsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  credentialItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  credentialName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  credentialText: {
    fontSize: 14,
    marginBottom: 3,
  },
});

