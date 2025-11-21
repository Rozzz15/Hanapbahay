/**
 * Button to diagnose why properties aren't showing
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { diagnoseMissingProperties } from '@/utils/diagnose-missing-properties';
import { forceSaveAllProperties } from '@/utils/force-save-properties';
import { fixPropertiesAvailability } from '@/utils/fix-properties-availability';
import { clearCache } from '@/utils/db';

export default function DiagnosePropertiesButton() {
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    try {
      console.log('🔍 Starting diagnostic...');
      const result = await diagnoseMissingProperties();
      
      let message = `Diagnostic Results:\n\n`;
      message += `AsyncStorage: ${result.inAsyncStorage} properties\n`;
      message += `Database: ${result.inDatabase} properties\n`;
      message += `Can Read: ${result.canRead ? '✅' : '❌'}\n\n`;
      
      if (result.issues.length > 0) {
        message += `Issues (${result.issues.length}):\n`;
        result.issues.slice(0, 5).forEach((issue, i) => {
          message += `${i + 1}. ${issue}\n`;
        });
        if (result.issues.length > 5) {
          message += `... and ${result.issues.length - 5} more\n`;
        }
      } else {
        message += `✅ No issues found!`;
      }
      
      Alert.alert('Diagnostic Results', message, [
        { text: 'OK' },
        ...(result.issues.length > 0 ? [{
          text: 'Fix Issues',
          onPress: handleFix
        }] : [])
      ]);
    } catch (error) {
      console.error('❌ Diagnostic error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleFix = async () => {
    setIsFixing(true);
    try {
      console.log('🔧 Starting fix process...');
      
      // Step 1: Fix availability
      console.log('1️⃣ Fixing availability...');
      const fixResult = await fixPropertiesAvailability();
      console.log('Fix result:', fixResult);
      
      // Step 2: Force save
      console.log('2️⃣ Force saving...');
      const saveResult = await forceSaveAllProperties();
      console.log('Save result:', saveResult);
      
      // Step 3: Clear cache
      console.log('3️⃣ Clearing cache...');
      await clearCache();
      
      // Step 4: Re-diagnose
      console.log('4️⃣ Re-diagnosing...');
      const reDiagnose = await diagnoseMissingProperties();
      
      let message = `Fix Complete!\n\n`;
      message += `Fixed: ${fixResult.fixedProperties} properties\n`;
      message += `Saved: ${saveResult.savedProperties} properties\n\n`;
      message += `After Fix:\n`;
      message += `AsyncStorage: ${reDiagnose.inAsyncStorage} properties\n`;
      message += `Database: ${reDiagnose.inDatabase} properties\n`;
      
      if (reDiagnose.inDatabase > 0) {
        message += `\n✅ Properties should now be visible!`;
        message += `\n\nTry refreshing the app.`;
      } else {
        message += `\n⚠️ Still no properties found.`;
        message += `\n\nTry running the seed again.`;
      }
      
      Alert.alert('Fix Complete', message, [{ text: 'OK' }]);
    } catch (error) {
      console.error('❌ Fix error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, (isDiagnosing || isFixing) && styles.buttonDisabled]}
        onPress={isDiagnosing ? handleDiagnose : handleFix}
        disabled={isDiagnosing || isFixing}
      >
        {isDiagnosing || isFixing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isDiagnosing ? 'Diagnosing...' : isFixing ? 'Fixing...' : 'Diagnose Properties'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});







