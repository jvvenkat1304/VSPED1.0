import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';

const SUPABASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';
const BASE_URL = `${SUPABASE_URL}/functions/v1`;

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  text: '#333333',
  textLight: '#6b7280',
  inputBackground: '#ffffff',
  border: '#e8e5df',
  placeholder: '#9ca3af',
  warning: '#c68e8e',
  success: '#9caf88',
};

interface AddChildFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddChildForm({ onSuccess, onCancel }: AddChildFormProps) {
  const sessionToken = useAuthStore(state => state.sessionToken) || '';
  const fetchChildren = useAuthStore(state => state.fetchChildren);

  const [childName, setChildName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [childGender, setChildGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddChild = async () => {
    if (!childName.trim()) {
      setError("Please enter your child's name");
      return;
    }
    if (!dobDay || !dobMonth || !dobYear) {
      setError("Date of birth is required");
      return;
    }

    const day = Number.parseInt(dobDay, 10);
    const month = Number.parseInt(dobMonth, 10);
    const year = Number.parseInt(dobYear, 10);

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > new Date().getFullYear()) {
      setError('Please enter a valid date of birth');
      return;
    }

    const dobFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/create-child`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          name: childName.trim(),
          dob: dobFormatted,
          gender: childGender || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Child profile created successfully!');
        await fetchChildren(); // Refresh the children list in the store
        onSuccess();
      } else {
        const detail = data.detail ? ` (${data.detail})` : '';
        setError((data.message || 'Failed to add child.') + detail);
      }
    } catch (err) {
      console.error('[AddChildForm] error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add Child</Text>
      <Text style={styles.privacyNote}>🔒 Encrypted — only you can see this</Text>

      {/* Child Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Child's Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Child's full name"
          placeholderTextColor={Colors.placeholder}
          value={childName}
          onChangeText={setChildName}
          autoCapitalize="words"
        />
      </View>

      {/* DOB */}
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

      {/* Buttons */}
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleAddChild}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Adding...' : 'Add Child'}
        </Text>
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingTop: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  privacyNote: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 24,
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
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.textLight,
    fontSize: 14,
  },
});
