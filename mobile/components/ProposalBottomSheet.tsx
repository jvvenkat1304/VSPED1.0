import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

const SUPABASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

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
  overlay: 'rgba(44, 82, 114, 0.5)',
  placeholder: '#9ca3af',
};

export interface ProposalBottomSheetProps {
  educatorId: string;
  educatorName: string;
  listedRate: number;
  isVisible: boolean;
  onClose: () => void;
  onSubmitted: (proposalId: string) => void;
  sessionToken: string;
  children: { id: string; name: string }[];
}

export default function ProposalBottomSheet({
  educatorId,
  educatorName,
  listedRate,
  isVisible,
  onClose,
  onSubmitted,
  sessionToken,
  children,
}: ProposalBottomSheetProps) {
  // Form state
  const [selectedChildId, setSelectedChildId] = useState<string>(
    children.length === 1 ? children[0].id : ''
  );
  const [sessionsPerWeek, setSessionsPerWeek] = useState(1);
  const [totalSessions, setTotalSessions] = useState('');
  const [proposedRate, setProposedRate] = useState(String(listedRate));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Parsed numeric values
  const totalSessionsNum = Number.parseInt(totalSessions, 10) || 0;
  const proposedRateNum = Number.parseInt(proposedRate, 10) || 0;

  // Cost breakdown (re-computed when total_sessions or rate changes)
  const costBreakdown = useMemo(() => {
    const subtotal = totalSessionsNum * proposedRateNum;
    const gst = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + gst;
    return { subtotal, gst, grandTotal };
  }, [totalSessionsNum, proposedRateNum]);

  // Soft warning: shown if proposed rate < listed rate
  const showRateWarning = proposedRateNum > 0 && proposedRateNum < listedRate;

  // Submit validation
  const isFormValid =
    selectedChildId !== '' &&
    sessionsPerWeek >= 1 &&
    sessionsPerWeek <= 7 &&
    totalSessionsNum >= 1 &&
    proposedRateNum >= 1;

  // Stepper handlers
  function decrementSessions() {
    if (sessionsPerWeek > 1) setSessionsPerWeek(sessionsPerWeek - 1);
  }

  function incrementSessions() {
    if (sessionsPerWeek < 7) setSessionsPerWeek(sessionsPerWeek + 1);
  }

  // Submit handler
  async function handleSubmit() {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/create-proposal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            child_id: selectedChildId,
            educator_id: educatorId,
            sessions_per_week: sessionsPerWeek,
            total_sessions: totalSessionsNum,
            proposed_rate_inr: proposedRateNum,
            notes: notes.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 201 && data.success) {
        Alert.alert('Proposal Submitted', 'Your session proposal has been sent to the educator.');
        onSubmitted(data.proposal_id);
        onClose();
        resetForm();
      } else if (response.status === 403) {
        Alert.alert(
          'Rate Too Low',
          "This rate is below the educator's acceptable range. Try a higher amount."
        );
      } else if (response.status === 429) {
        Alert.alert('Too Many Proposals', 'Too many proposals. Please try again later.');
      } else {
        const message = data?.error || data?.message || 'Something went wrong. Please try again.';
        Alert.alert('Error', message);
      }
    } catch (err) {
      console.error('[ProposalBottomSheet] error:', err);
      Alert.alert('Network Error', 'Could not connect to the server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedChildId(children.length === 1 ? children[0].id : '');
    setSessionsPerWeek(1);
    setTotalSessions('');
    setProposedRate(String(listedRate));
    setNotes('');
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Propose Sessions to {educatorName}</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            {/* Child Selector (hidden if only one child) */}
            {children.length > 1 && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Select Child</Text>
                <View style={styles.childSelector}>
                  {children.map((child) => (
                    <Pressable
                      key={child.id}
                      style={[
                        styles.childChip,
                        selectedChildId === child.id && styles.childChipSelected,
                      ]}
                      onPress={() => setSelectedChildId(child.id)}
                    >
                      <Text
                        style={[
                          styles.childChipText,
                          selectedChildId === child.id && styles.childChipTextSelected,
                        ]}
                      >
                        {child.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Sessions Per Week — Stepper */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Sessions per Week</Text>
              <View style={styles.stepper}>
                <Pressable
                  style={[styles.stepperButton, sessionsPerWeek <= 1 && styles.stepperButtonDisabled]}
                  onPress={decrementSessions}
                  disabled={sessionsPerWeek <= 1}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{sessionsPerWeek}</Text>
                <Pressable
                  style={[styles.stepperButton, sessionsPerWeek >= 7 && styles.stepperButtonDisabled]}
                  onPress={incrementSessions}
                  disabled={sessionsPerWeek >= 7}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Total Sessions */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Total Sessions</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="e.g. 12"
                placeholderTextColor={Colors.placeholder}
                value={totalSessions}
                onChangeText={(text) => setTotalSessions(text.replace(/\D/g, ''))}
              />
            </View>

            {/* Proposed Rate */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Proposed Rate (₹ per session)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder={`Listed: ₹${listedRate}`}
                placeholderTextColor={Colors.placeholder}
                value={proposedRate}
                onChangeText={(text) => setProposedRate(text.replace(/\D/g, ''))}
              />
            </View>

            {/* Soft Warning */}
            {showRateWarning && (
              <Text style={styles.rateWarning}>
                This rate is below the listed rate. The educator may counter-propose.
              </Text>
            )}

            {/* Cost Breakdown */}
            {totalSessionsNum >= 1 && proposedRateNum >= 1 && (
              <View style={styles.costBreakdown}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>
                    Subtotal: {totalSessionsNum} × ₹{proposedRateNum}
                  </Text>
                  <Text style={styles.costValue}>₹{costBreakdown.subtotal}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>GST (18%)</Text>
                  <Text style={styles.costValue}>₹{costBreakdown.gst}</Text>
                </View>
                <View style={[styles.costRow, styles.costTotalRow]}>
                  <Text style={styles.costTotalLabel}>Total</Text>
                  <Text style={styles.costTotalValue}>₹{costBreakdown.grandTotal}</Text>
                </View>
              </View>
            )}

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                multiline
                maxLength={500}
                placeholder="Any special requests or notes..."
                placeholderTextColor={Colors.placeholder}
                value={notes}
                onChangeText={setNotes}
              />
              <Text style={styles.charCount}>{notes.length}/500</Text>
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isFormValid || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Proposal</Text>
              )}
            </Pressable>

            {/* Consent Notice */}
            <Text style={styles.consentNotice}>
              When accepted, the educator will receive time-limited access to your child's data
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 34,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
    paddingRight: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  childSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  childChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  childChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  childChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  childChipTextSelected: {
    color: '#ffffff',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    backgroundColor: Colors.border,
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepperValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: Colors.placeholder,
    textAlign: 'right',
    marginTop: 4,
  },
  rateWarning: {
    fontSize: 13,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
    lineHeight: 18,
  },
  costBreakdown: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  costValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  costTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginBottom: 0,
  },
  costTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  costTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  consentNotice: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 17,
  },
});
