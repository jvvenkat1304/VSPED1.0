import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  text: '#333333',
  textLight: '#6b7280',
  warning: '#c68e8e',
};

const BASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

export default function PinEntryPage() {
  const { user_id, session_token, role } = useLocalSearchParams<{ user_id: string; session_token: string; role: string }>();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const verifyPin = async (pinCode: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BASE_URL}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({ user_id, pin: pinCode }),
      });

      const data = await response.json();

      if (data.success) {
        // Update global auth store with the verified session
        const sessionToken = data.session_token || session_token || '';
        const userRole = data.role || role || 'parent';
        await useAuthStore.getState().setAuth(user_id || '', sessionToken, userRole);
        // PIN verified — navigate based on role
        if (userRole === 'special_educator') {
          router.replace('/dashboard/educator');
        } else {
          router.replace('/dashboard/parent');
        }
      } else {
        setError(data.message || 'Incorrect PIN');
        setPin('');
      }
    } catch (err) {
      setError('Network error');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enter your PIN</Text>
        <Text style={styles.subtitle}>Enter your 4-digit PIN to continue</Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, i < pin.length && styles.dotFilled]}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text style={styles.loading}>Verifying...</Text> : null}

      {/* Number Pad */}
      <View style={styles.numpad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numpadRow}>
            {row.map((key) => (
              <Pressable
                key={key || 'empty'}
                style={[styles.numpadKey, !key && styles.numpadKeyEmpty]}
                onPress={() => {
                  if (key === '⌫') handleDelete();
                  else if (key) handleDigit(key);
                }}
                disabled={loading}
              >
                <Text style={styles.numpadKeyText}>{key}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {/* Forgot PIN */}
      <Pressable style={styles.forgotButton} onPress={() => router.replace('/auth/phone-entry')}>
        <Text style={styles.forgotText}>Forgot PIN? Verify with OTP again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  error: {
    color: Colors.warning,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  loading: {
    color: Colors.primary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  numpad: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  numpadKey: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  numpadKeyEmpty: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  numpadKeyText: {
    fontSize: 28,
    fontWeight: '500',
    color: Colors.text,
  },
  forgotButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  forgotText: {
    color: Colors.textLight,
    fontSize: 14,
  },
});
