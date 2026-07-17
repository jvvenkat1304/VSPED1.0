import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';

const SUPABASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';
const BASE_URL = `${SUPABASE_URL}/functions/v1`;

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  text: '#333333',
  textLight: '#6b7280',
  card: '#ffffff',
  border: '#e8e5df',
  success: '#9caf88',
};

interface PaymentPromptProps {
  proposalId: string;
  sessionToken: string;
  sessionsCount: number;
  ratePerSession: number;
  subtotalInr: number;
  gstInr: number;
  totalInr: number;
  onPaymentInitiated?: () => void;
}

export default function PaymentPrompt({
  proposalId,
  sessionToken,
  sessionsCount,
  ratePerSession,
  subtotalInr,
  gstInr,
  totalInr,
  onPaymentInitiated,
}: PaymentPromptProps) {
  const [loading, setLoading] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);

  async function handlePayNow() {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/create-payment-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ proposal_id: proposalId }),
      });

      const data = await response.json();

      if (data.success && data.checkout_url) {
        // Open Razorpay payment link in the device browser
        const canOpen = await Linking.canOpenURL(data.checkout_url);
        if (canOpen) {
          await Linking.openURL(data.checkout_url);
          setPaymentPending(true);
          onPaymentInitiated?.();
          Alert.alert(
            'Complete Payment',
            'Complete payment in your browser. Your booking will confirm automatically once payment is received.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', 'Unable to open payment page. Please try again.');
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to create payment. Please try again.');
      }
    } catch (error) {
      console.error('[PaymentPrompt] error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function confirmPayment() {
    Alert.alert(
      'Confirm Payment',
      `Pay ₹${totalInr.toLocaleString('en-IN')} for ${sessionsCount} sessions?\n\nYou will be redirected to a secure payment page.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue to Payment', onPress: handlePayNow },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Payment Summary</Text>

      {/* Breakdown */}
      <View style={styles.breakdownSection}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>
            {sessionsCount} sessions × ₹{ratePerSession.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.rowValue}>₹{subtotalInr.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>GST (18%)</Text>
          <Text style={styles.rowValue}>₹{gstInr.toLocaleString('en-IN')}</Text>
        </View>

        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{totalInr.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Pending payment message */}
      {paymentPending && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>
            💳 Payment initiated. Complete payment in your browser. Your booking will confirm automatically.
          </Text>
        </View>
      )}

      {/* Pay Now Button */}
      <Pressable
        style={[styles.payButton, (loading || paymentPending) && styles.payButtonDisabled]}
        onPress={confirmPayment}
        disabled={loading || paymentPending}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.payButtonText}>
            {paymentPending ? 'Payment Pending...' : 'Pay Now'}
          </Text>
        )}
      </Pressable>

      <Text style={styles.secureNote}>🔒 Secure payment powered by Razorpay</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 16,
  },
  breakdownSection: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  pendingBanner: {
    backgroundColor: '#fef3e6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f5d5a0',
  },
  pendingText: {
    fontSize: 13,
    color: '#8b5c00',
    textAlign: 'center',
    lineHeight: 18,
  },
  payButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secureNote: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
