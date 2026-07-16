import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  text: '#333333',
  textLight: '#6b7280',
  inputBackground: '#ffffff',
  border: '#e8e5df',
  success: '#9caf88',
  warning: '#c68e8e',
};

const BASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

export default function OtpVerifyPage() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    // Handle paste/autofill: if text has multiple chars, spread across boxes
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      setError('');

      // Focus last filled box or submit
      const lastIndex = Math.min(index + digits.length - 1, 5);
      if (lastIndex === 5 && newOtp.join('').length === 6) {
        verifyOtp(newOtp.join(''));
      } else {
        inputs.current[Math.min(lastIndex + 1, 5)]?.focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (index === 5 && text) {
      const code = newOtp.join('');
      if (code.length === 6) {
        verifyOtp(code);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (code: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({ phone, otp_code: code }),
      });

      const data = await response.json();

      if (data.success) {
        // Store auth immediately so all subsequent screens have access
        await useAuthStore.getState().setAuth(
          data.user_id,
          data.session_token,
          data.refresh_token || '',
          data.role || 'parent'
        );

        if (data.is_new_user) {
          // New user — go to PIN creation
          router.replace({
            pathname: '/auth/set-pin',
            params: { user_id: data.user_id, session_token: data.session_token, role: data.role },
          });
        } else {
          // Returning user — go to PIN entry
          router.replace({
            pathname: '/auth/pin-entry',
            params: { user_id: data.user_id, session_token: data.session_token, role: data.role },
          });
        }
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const maskedPhone = phone ? `+${phone.slice(0, 2)} ****${phone.slice(-4)}` : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to {maskedPhone}
          </Text>
        </View>

        {/* OTP Input Boxes */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputs.current[index] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? 6 : 1}
              autoFocus={index === 0}
              selectTextOnFocus
              textContentType={index === 0 ? 'oneTimeCode' : 'none'}
              autoComplete={index === 0 ? 'sms-otp' : 'off'}
            />
          ))}
        </View>

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Loading indicator */}
        {loading ? <Text style={styles.verifying}>Verifying...</Text> : null}

        {/* Resend */}
        <Pressable style={styles.resendButton} onPress={() => router.back()}>
          <Text style={styles.resendText}>Didn't receive the code? Go back and resend</Text>
        </Pressable>

        {/* Back */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
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
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  otpBoxFilled: {
    borderColor: Colors.accent,
    backgroundColor: '#fffdf8',
  },
  error: {
    color: Colors.warning,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  verifying: {
    color: Colors.primary,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 12,
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendText: {
    color: Colors.textLight,
    fontSize: 14,
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
