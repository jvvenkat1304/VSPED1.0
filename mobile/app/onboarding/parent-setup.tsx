import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  secondary: '#7fb2b8',
  text: '#333333',
  textLight: '#6b7280',
  inputBackground: '#ffffff',
  border: '#e8e5df',
  placeholder: '#9ca3af',
  warning: '#c68e8e',
};

const BASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

export default function ParentSetupPage() {
  const { session_token: paramToken } = useLocalSearchParams<{ session_token: string }>();
  const storeToken = useAuthStore(state => state.sessionToken);
  const session_token = storeToken || paramToken || '';
  
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [childGender, setChildGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!parentName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!childName.trim()) {
      setError("Please enter your child's name");
      return;
    }
    if (!dobDay || !dobMonth || !dobYear) {
      setError("Date of birth is required for age assessment");
      return;
    }

    // Build and validate the date
    const day = Number.parseInt(dobDay, 10);
    const month = Number.parseInt(dobMonth, 10);
    const year = Number.parseInt(dobYear, 10);
    
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > new Date().getFullYear()) {
      setError('Please enter a valid date of birth');
      return;
    }

    const dobFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dobDate = new Date(dobFormatted);
    if (Number.isNaN(dobDate.getTime()) || dobDate > new Date()) {
      setError('Please enter a valid date of birth');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/create-child`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session_token}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          name: childName.trim(),
          dob: dobFormatted,
          gender: childGender || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.replace('/dashboard/parent');
      } else {
        // Show detailed error for debugging
        const detail = data.detail ? ` (${data.detail})` : '';
        setError((data.message || 'Failed to create profile.') + detail);
      }
    } catch (err) {
      console.error('[ParentSetup] error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>Tell us about yourself and your child</Text>
        </View>

        {/* Parent Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={Colors.placeholder}
            value={parentName}
            onChangeText={setParentName}
            autoCapitalize="words"
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <Text style={styles.dividerText}>Child's Information</Text>
          <Text style={styles.privacyNote}>🔒 Encrypted — only you can see this</Text>
        </View>

        {/* Child Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Child's Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Child's full name"
            placeholderTextColor={Colors.placeholder}
            value={childName}
            onChangeText={setChildName}
            autoCapitalize="words"
          />
        </View>

        {/* Child DOB */}
        <View style={styles.field}>
          <Text style={styles.label}>Date of Birth *</Text>
          <View style={styles.dobRow}>
            <TextInput
              style={[styles.input, styles.dobInput]}
              placeholder="DD"
              placeholderTextColor={Colors.placeholder}
              value={dobDay}
              onChangeText={(t) => setDobDay(t.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.dobInput]}
              placeholder="MM"
              placeholderTextColor={Colors.placeholder}
              value={dobMonth}
              onChangeText={(t) => setDobMonth(t.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.dobInputYear]}
              placeholder="YYYY"
              placeholderTextColor={Colors.placeholder}
              value={dobYear}
              onChangeText={(t) => setDobYear(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <Text style={styles.hint}>Required for age assessment</Text>
        </View>

        {/* Gender */}
        <View style={styles.field}>
          <Text style={styles.label}>Gender (optional)</Text>
          <View style={styles.genderRow}>
            {(['male', 'female', 'other'] as const).map((g) => (
              <Pressable
                key={g}
                style={[styles.genderButton, childGender === g && styles.genderButtonActive]}
                onPress={() => setChildGender(g)}
              >
                <Text style={[styles.genderText, childGender === g && styles.genderTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Continue Button */}
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Setting up...' : 'Continue'}
          </Text>
        </Pressable>

        {/* Skip for now */}
        <Pressable style={styles.skipButton} onPress={() => router.replace('/dashboard/parent')}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
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
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    color: Colors.text,
  },
  hint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  dobRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dobInput: {
    flex: 1,
    textAlign: 'center',
  },
  dobInputYear: {
    flex: 1.5,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dividerText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  privacyNote: {
    fontSize: 12,
    color: Colors.textLight,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
  },
  genderButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: '#fffdf8',
  },
  genderText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  genderTextActive: {
    color: Colors.accent,
    fontWeight: '600',
  },
  error: {
    color: Colors.warning,
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    color: Colors.textLight,
    fontSize: 14,
  },
});
