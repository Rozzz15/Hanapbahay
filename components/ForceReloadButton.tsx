/**
 * Force Reload Button - Temporary debug tool
 * Add this to tenant dashboard to force reload listings
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react';
import { RefreshCw } from 'lucide-react-native';

interface ForceReloadButtonProps {
  onReload: () => Promise<void>;
}

export default function ForceReloadButton({ onReload }: ForceReloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleReload = async () => {
    try {
      setLoading(true);
      console.log('🔄 Force reload triggered...');
      await onReload();
      console.log('✅ Force reload completed');
    } catch (error) {
      console.error('❌ Force reload failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleReload}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <RefreshCw size={16} color="white" />
          <Text style={styles.text}>Force Reload</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});

