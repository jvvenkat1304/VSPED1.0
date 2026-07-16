import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';

const SUPABASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  secondary: '#7fb2b8',
  success: '#9caf88',
  warning: '#c68e8e',
  text: '#333333',
  textLight: '#6b7280',
  card: '#ffffff',
  border: '#e8e5df',
  white: '#ffffff',
};

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

interface ScheduleConfig {
  available_days: string[];
  session_start_time: string;
  session_end_time: string;
  recommended_weeks: number;
  schedule_notes: string;
}

export default function EducatorOfferings({ sessionToken }: { sessionToken: string }) {
  const userId = useAuthStore(state => state.userId);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [recommendedWeeks, setRecommendedWeeks] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('edit');
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  useEffect(() => {
    loadExistingConfig();
  }, [sessionToken]);

  async function loadExistingConfig() {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionToken}` } },
      });
      const { data } = await supabase
        .from('educator_profiles')
        .select('schedule_config')
        .single();

      if (data?.schedule_config) {
        const config = data.schedule_config as ScheduleConfig;
        setAvailableDays(config.available_days || []);
        setStartTime(config.session_start_time || '');
        setEndTime(config.session_end_time || '');
        setRecommendedWeeks(config.recommended_weeks ? String(config.recommended_weeks) : '');
        setNotes(config.schedule_notes || '');
        setHasExistingConfig(true);
        setMode('view');
      }
    } catch {
      // No existing config — that's fine
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(dayKey: string) {
    setAvailableDays(prev =>
      prev.includes(dayKey) ? prev.filter(d => d !== dayKey) : [...prev, dayKey]
    );
  }

  async function handleSave() {
    if (!sessionToken || !userId) {
      Alert.alert('Error', 'Please log in again.');
      return;
    }

    if (availableDays.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one available day.');
      return;
    }

    setSaving(true);
    try {
      const scheduleConfig: ScheduleConfig = {
        available_days: availableDays,
        session_start_time: startTime,
        session_end_time: endTime,
        recommended_weeks: parseInt(recommendedWeeks, 10) || 0,
        schedule_notes: notes,
      };

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionToken}` } },
      });

      const { error } = await supabase
        .from('educator_profiles')
        .update({ schedule_config: scheduleConfig })
        .eq('id', userId);

      if (error) {
        console.error('Save error:', error.message);
        Alert.alert('Error', 'Could not save schedule. Please try again.');
      } else {
        setHasExistingConfig(true);
        setMode('view');
        Alert.alert('Saved!', 'Your schedule and offerings have been updated.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </View>
    );
  }

  // VIEW MODE — non-editable overview + parent preview
  if (mode === 'view' && hasExistingConfig) {
    const dayLabels = DAYS.filter(d => availableDays.includes(d.key)).map(d => d.label);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Offering</Text>
        <Text style={styles.subtitle}>This is how your schedule appears to parents</Text>

        {/* Overview Card */}
        <View style={[styles.section, { borderWidth: 1.5, borderColor: Colors.accent }]}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.accent, marginBottom: 12 }}>👁️ PARENT PREVIEW</Text>

          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, color: Colors.textLight, marginBottom: 4 }}>Available Days</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {dayLabels.map(day => (
                <View key={day} style={{ backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.white }}>{day}</Text>
                </View>
              ))}
            </View>
          </View>

          {(startTime || endTime) && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: Colors.textLight, marginBottom: 4 }}>Session Time</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text }}>
                {startTime || '--:--'} — {endTime || '--:--'}
              </Text>
            </View>
          )}

          {recommendedWeeks ? (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: Colors.textLight, marginBottom: 4 }}>Recommended Duration</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text }}>
                {recommendedWeeks} weeks
              </Text>
            </View>
          ) : null}

          {notes ? (
            <View>
              <Text style={{ fontSize: 12, color: Colors.textLight, marginBottom: 4 }}>Notes</Text>
              <Text style={{ fontSize: 14, color: Colors.text, lineHeight: 20 }}>{notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Edit Button */}
        <Pressable
          style={{ backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 }}
          onPress={() => setMode('edit')}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.white }}>✏️ Edit Offering</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Schedule & Offerings</Text>
      <Text style={styles.subtitle}>Set your availability so parents know when you teach</Text>

      {/* Section 1: Available Days */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Days</Text>
        <Text style={styles.sectionHelper}>Tap to toggle which days you teach</Text>
        <View style={styles.daysRow}>
          {DAYS.map(day => {
            const isSelected = availableDays.includes(day.key);
            return (
              <Pressable
                key={day.key}
                style={[styles.dayToggle, isSelected && styles.dayToggleSelected]}
                onPress={() => toggleDay(day.key)}
              >
                <Text style={[styles.dayToggleText, isSelected && styles.dayToggleTextSelected]}>
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Section 2: Session Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Time</Text>
        <Text style={styles.sectionHelper}>Your default session window (HH:MM format)</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeInput}>
            <Text style={styles.inputLabel}>Start</Text>
            <TextInput
              style={styles.input}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="10:00"
              placeholderTextColor={Colors.textLight}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <Text style={styles.timeSeparator}>to</Text>
          <View style={styles.timeInput}>
            <Text style={styles.inputLabel}>End</Text>
            <TextInput
              style={styles.input}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="11:00"
              placeholderTextColor={Colors.textLight}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>
      </View>

      {/* Section 3: Recommended Weeks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Weeks</Text>
        <Text style={styles.sectionHelper}>How many weeks do you recommend for a full course?</Text>
        <TextInput
          style={styles.input}
          value={recommendedWeeks}
          onChangeText={setRecommendedWeeks}
          placeholder="12"
          placeholderTextColor={Colors.textLight}
          keyboardType="number-pad"
          maxLength={3}
        />
        <Text style={styles.helperNote}>This helps parents know what to expect</Text>
      </View>

      {/* Section 4: Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <Text style={styles.sectionHelper}>Any additional info about your teaching approach or schedule</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. I prefer morning sessions, I take breaks between 1-2 PM..."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Save Button */}
      <Pressable
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.saveBtnText}>Save</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textLight },

  title: { fontSize: 22, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textLight, marginBottom: 28 },

  section: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  sectionHelper: { fontSize: 12, color: Colors.textLight, marginBottom: 14 },

  // Days toggles
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  dayToggleSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  dayToggleText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  dayToggleTextSelected: { color: Colors.white },

  // Time inputs
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  timeInput: { flex: 1 },
  timeSeparator: { fontSize: 14, color: Colors.textLight, paddingBottom: 14 },
  inputLabel: { fontSize: 12, color: Colors.textLight, marginBottom: 6 },

  // General input
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  helperNote: { fontSize: 11, color: Colors.textLight, fontStyle: 'italic', marginTop: 8 },

  // Save button
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: Colors.white },
});
