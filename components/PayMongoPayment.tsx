import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { handlePayMongoWebViewUrl, handlePayMongoCallback } from '../utils/paymongo-webview-handler';

interface PayMongoPaymentProps {
  paymentUrl: string;
  onPaymentSuccess?: (paymentId: string) => void;
  onPaymentError?: (error: string) => void;
  onPaymentCancel?: () => void;
}

export default function PayMongoPayment({
  paymentUrl,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
}: PayMongoPaymentProps) {
  const [loading, setLoading] = useState(true);

  const handleShouldStartLoadWithRequest = (request: { url: string }): boolean => {
    const url = request.url;
    
    // Handle GCash deep links from PayMongo WebView
    // This applies PayMongo WebView handling to all GCash redirects
    if (url.startsWith('gcash://')) {
      // Use PayMongo WebView handler to open GCash app
      if (handlePayMongoWebViewUrl(url)) {
        return false; // Prevent WebView from loading GCash URL, app will open instead
      }
    }
    
    // Check if this is a PayMongo callback URL
    if (url.includes('success') || url.includes('cancel') || url.includes('callback') || 
        url.includes('payment-success') || url.includes('payment-cancel')) {
      handlePayMongoCallback(url).then((result) => {
        if (result.success && result.paymentId) {
          onPaymentSuccess?.(result.paymentId);
        } else if (url.includes('cancel') || url.includes('payment-cancel')) {
          onPaymentCancel?.();
        } else {
          onPaymentError?.(result.error || 'Payment failed');
        }
      }).catch((error) => {
        console.error('Error handling PayMongo callback:', error);
        onPaymentError?.(error instanceof Error ? error.message : 'Payment callback error');
      });
    }
    
    return true; // Allow other URLs to load
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      )}
      <WebView
        source={{ uri: paymentUrl }}
        style={styles.webview}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          onPaymentError?.(nativeEvent.description || 'Failed to load payment page');
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1,
  },
});

