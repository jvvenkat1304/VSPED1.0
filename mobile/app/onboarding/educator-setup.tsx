import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  secondary: '#7fb2b8',
  success: '#9caf88',
  text: '#333333',
  textLight: '#6b7280',
  inputBackground: '#ffffff',
  border: '#e8e5df',
  placeholder: '#9ca3af',
  warning: '#c68e8e',
};

const BASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

const SUBJECTS = [
  'Speech Therapy', 'Occupational Therapy', 'Behavioural Therapy',
  'Special Education', 'Maths', 'Science', 'English', 'Social Skills',
  'Autism Spectrum', 'Learning Disabilities', 'ADHD Support',
];

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];

export default function EducatorSetupPage() {
  const { user_id, session_token } = useLocalSearchParams<{ user_id: string; session_token: string }>();

  const [fullName, setFullName] = useState('');
  const [rciNumber, setRciNumber] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [sessionRate, setSessionRate] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [rciVerified, setRciVerified] = useState(false);
  const [step, setStep] = useState<'profile' | 'verification'>('profile');

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleCreateProfile = async () => {
    if (!fullName.trim()) { setError('Name is required'); return; }
    if (!rciNumber.trim()) { setError('RCI number is required'); return; }
    if (selectedSubjects.length === 0) { setError('Select at least one subject'); return; }
    if (selectedLanguages.length === 0) { setError('Select at least one language'); return; }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/create-educator-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session_token}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          rci_number: rciNumber.trim(),
          subjects: selectedSubjects,
          languages: selectedLanguages,
          bio: bio.trim() || null,
          city: city.trim() || null,
          session_rate_inr: sessionRate ? parseInt(sessionRate) : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('verification');
      } else {
        setError(data.message || 'Failed to create profile');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRci = async () => {
    setVerifying(true);
    setError('');

    try {
      const response = await fetch(`${BASE_URL}/verify-rci`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session_token}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success || data.already_verified) {
        setRciVerified(true);
        // Wait a moment then navigate to educator dashboard
        setTimeout(() => router.replace('/dashboard/educator'), 1500);
      } else {
        setError(data.message || 'RCI verification failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setVerifying(false);
    }
  };

  if (step === 'verification') {
    return (
      <View style={styles.verifyContainer}>
        <Text style={styles.verifyEmoji}>{rciVerified ? '✅' : '🔐'}</Text>
        <Text style={styles.verifyTitle}>
          {rciVerified ? 'RCI Verified!' : 'Verify your RCI Credentials'}
        </Text>
        <Text style={styles.verifySubtitle}>
          {rciVerified
            ? 'Your profile is now live. Redirecting to your dashboard...'
            : `We'll check your RCI number (${rciNumber}) against the Rehabilitation Council of India registry.`}
        </Text>

        {!rciVerified && (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.button, verifying && styles.buttonDisabled]}
              onPress={handleVerifyRci}
              disabled={verifying}
            >
              <Text style={styles.buttonText}>
                {verifying ? 'Verifying...' : 'Verify Now'}
              </Text>
            </Pressable>
          </>
        )}

        {rciVerified && (
          <View style={styles.successBadge}>
            <Text style={styles.successText}>✓ RCI Certified Educator</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Educator Profile</Text>
          <Text style={styles.subtitle}>Set up your professional profile</Text>
        </View>

        {/* Full Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor={Colors.placeholder}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        {/* RCI Number */}
        <View style={styles.field}>
          <Text style={styles.label}>RCI Registration Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. A12345"
            placeholderTextColor={Colors.placeholder}
            value={rciNumber}
            onChangeText={setRciNumber}
            autoCapitalize="characters"
          />
          <Text style={styles.hint}>This will be verified against the RCI portal</Text>
        </View>

        {/* Subjects */}
        <View style={styles.field}>
          <Text style={styles.label}>Subjects / Specializations *</Text>
          <View style={styles.chipGrid}>
            {SUBJECTS.map((subject) => (
              <Pressable
                key={subject}
                style={[styles.chip, selectedSubjects.includes(subject) && styles.chipActive]}
                onPress={() => toggleSubject(subject)}
              >
                <Text style={[styles.chipText, selectedSubjects.includes(subject) && styles.chipTextActive]}>
                  {subject}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Languages */}
        <View style={styles.field}>
          <Text style={styles.label}>Languages *</Text>
          <View style={styles.chipGrid}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                style={[styles.chip, selectedLanguages.includes(lang) && styles.chipActive]}
                onPress={() => toggleLanguage(lang)}
              >
                <Text style={[styles.chipText, selectedLanguages.includes(lang) && styles.chipTextActive]}>
                  {lang}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* City */}
        <View style={styles.field}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Your city"
            placeholderTextColor={Colors.placeholder}
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
        </View>

        {/* Session Rate */}
        <View style={styles.field}>
          <Text style={styles.label}>Session Rate (₹ per session)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 800"
            placeholderTextColor={Colors.placeholder}
            value={sessionRate}
            onChangeText={setSessionRate}
            keyboardType="numeric"
          />
        </View>

        {/* Bio */}
        <View style={styles.field}>
          <Text style={styles.label}>About You</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief description of your experience and approach..."
            placeholderTextColor={Colors.placeholder}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Submit */}
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Profile...' : 'Continue to Verification'}
          </Text>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
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
    marginBottom: 22,
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
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
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
  // Verification step styles
  verifyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  verifyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  verifyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  verifySubtitle: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  successBadge: {
    backgroundColor: '#eef7f4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.success,
  },
  successText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
});
