import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

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

export default function SetPinPage() {
  const { user_id, session_token, role } = useLocalSearchParams<{ user_id: string; session_token: string; role: string }>();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDigit = (digit: string) => {
    if (stage === 'enter') {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === 4) {
          setTimeout(() => setStage('confirm'), 200);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + digit;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 4) {
          if (newConfirm === pin) {
            createPin(newConfirm);
          } else {
            setError("PINs don't match. Try again.");
            setPin('');
            setConfirmPin('');
            setStage('enter');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (stage === 'enter') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
    setError('');
  };

  const createPin = async (pinCode: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/create-pin`, {
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
        // PIN created — navigate to role selection
        router.replace({
          pathname: '/auth/role-select',
          params: { user_id, session_token },
        });
      } else {
        setError(data.message || 'Failed to create PIN');
        setPin('');
        setConfirmPin('');
        setStage('enter');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const currentPin = stage === 'enter' ? pin : confirmPin;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {stage === 'enter' ? 'Create a PIN' : 'Confirm your PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {stage === 'enter'
            ? 'Choose a 4-digit PIN for quick login'
            : 'Enter the same PIN again to confirm'}
        </Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, i < currentPin.length && styles.dotFilled]}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text style={styles.loading}>Creating PIN...</Text> : null}

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
    paddingBottom: 40,
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
});
