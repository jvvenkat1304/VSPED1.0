import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

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
};

const BASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

interface EducatorProposalsInboxProps {
  sessionToken: string;
}

interface Proposal {
  id: string;
  status: string;
  parent_name?: string;
  child_name?: string;
  sessions_per_week: number;
  total_sessions: number;
  proposed_rate_inr: number;
  counter_rate_inr?: number;
  counter_sessions_per_week?: number;
  counter_total_sessions?: number;
  counter_notes?: string;
  notes?: string;
  created_at: string;
  expires_at: string;
}

interface CounterForm {
  proposalId: string;
  counter_rate_inr: string;
  counter_sessions_per_week: string;
  counter_total_sessions: string;
  counter_notes: string;
}

export default function EducatorProposalsInbox({ sessionToken }: EducatorProposalsInboxProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [counterForm, setCounterForm] = useState<CounterForm | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/get-proposals?role=educator&status=pending,countered,accepted,rejected,expired,withdrawn`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
            apikey: ANON_KEY,
          },
        },
      );
      const data = await response.json();
      if (data.success && data.proposals) {
        setProposals(data.proposals);
      }
    } catch {
      Alert.alert('Error', 'Failed to load proposals. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  useFocusEffect(
    useCallback(() => {
      fetchProposals();
    }, [fetchProposals])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      fetchProposals();
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetchProposals]);

  // Group proposals by status category
  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const counteredProposals = proposals.filter((p) => p.status === 'countered');
  const historicalProposals = proposals.filter((p) =>
    ['accepted', 'rejected', 'expired', 'withdrawn', 'parent_accepted', 'paid'].includes(p.status),
  );

  async function handleAccept(proposalId: string) {
    setActionLoading(proposalId);
    try {
      const response = await fetch(`${BASE_URL}/respond-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ proposal_id: proposalId, action: 'accept' }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Proposal accepted. Consent has been granted and payment is pending.');
        fetchProposals();
      } else {
        Alert.alert('Error', data.error || 'Failed to accept proposal.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  function handleReject(proposalId: string) {
    Alert.alert(
      'Reject Proposal',
      'Are you sure you want to reject this proposal? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(proposalId);
            try {
              const response = await fetch(`${BASE_URL}/respond-proposal`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${sessionToken}`,
                  apikey: ANON_KEY,
                },
                body: JSON.stringify({ proposal_id: proposalId, action: 'reject' }),
              });
              const data = await response.json();
              if (data.success) {
                Alert.alert('Done', 'Proposal rejected.');
                fetchProposals();
              } else {
                Alert.alert('Error', data.error || 'Failed to reject proposal.');
              }
            } catch {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }

  function handleCounterOpen(proposalId: string) {
    setCounterForm({
      proposalId,
      counter_rate_inr: '',
      counter_sessions_per_week: '',
      counter_total_sessions: '',
      counter_notes: '',
    });
  }

  async function handleCounterSubmit() {
    if (!counterForm) return;

    const rate = parseInt(counterForm.counter_rate_inr, 10);
    const sessionsPerWeek = parseInt(counterForm.counter_sessions_per_week, 10);
    const totalSessions = parseInt(counterForm.counter_total_sessions, 10);

    if (!rate || rate < 1) {
      Alert.alert('Validation', 'Please enter a valid counter rate.');
      return;
    }
    if (!sessionsPerWeek || sessionsPerWeek < 1 || sessionsPerWeek > 7) {
      Alert.alert('Validation', 'Sessions per week must be between 1 and 7.');
      return;
    }
    if (!totalSessions || totalSessions < 1) {
      Alert.alert('Validation', 'Total sessions must be at least 1.');
      return;
    }

    setActionLoading(counterForm.proposalId);
    try {
      const response = await fetch(`${BASE_URL}/respond-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          proposal_id: counterForm.proposalId,
          action: 'counter',
          counter_rate_inr: rate,
          counter_sessions_per_week: sessionsPerWeek,
          counter_total_sessions: totalSessions,
          counter_notes: counterForm.counter_notes || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Counter-proposal sent. Waiting for parent response.');
        setCounterForm(null);
        fetchProposals();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit counter-proposal.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending':
        return Colors.accent;
      case 'accepted':
      case 'parent_accepted':
      case 'paid':
        return Colors.success;
      case 'rejected':
        return Colors.warning;
      case 'countered':
        return Colors.secondary;
      case 'expired':
      case 'withdrawn':
        return Colors.textLight;
      default:
        return Colors.textLight;
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderProposalCard(proposal: Proposal, showActions: boolean) {
    const isLoading = actionLoading === proposal.id;
    const isCounterFormOpen = counterForm?.proposalId === proposal.id;

    return (
      <View key={proposal.id} style={[styles.proposalCard, { borderLeftColor: getStatusColor(proposal.status) }]}>
        {/* Parent name and status */}
        <View style={styles.cardHeader}>
          <Text style={styles.parentName}>{proposal.parent_name || 'Parent'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(proposal.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(proposal.status) }]}>
              {proposal.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Child privacy: NEVER show child details */}
        <Text style={styles.childLabel}>Child (consent pending)</Text>

        {/* Proposal details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Sessions/week</Text>
            <Text style={styles.detailValue}>{proposal.sessions_per_week}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total sessions</Text>
            <Text style={styles.detailValue}>{proposal.total_sessions}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Proposed rate</Text>
            <Text style={styles.detailValue}>₹{proposal.proposed_rate_inr}</Text>
          </View>
        </View>

        {/* Notes */}
        {proposal.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{proposal.notes}</Text>
          </View>
        ) : null}

        {/* Date */}
        <Text style={styles.dateText}>{formatDate(proposal.created_at)}</Text>

        {/* Action buttons for pending proposals */}
        {showActions && !isCounterFormOpen && (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleAccept(proposal.id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.acceptBtnText}>Accept</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(proposal.id)}
              disabled={isLoading}
            >
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.counterBtn]}
              onPress={() => handleCounterOpen(proposal.id)}
              disabled={isLoading}
            >
              <Text style={styles.counterBtnText}>Counter</Text>
            </Pressable>
          </View>
        )}

        {/* Counter form */}
        {isCounterFormOpen && (
          <View style={styles.counterFormContainer}>
            <Text style={styles.counterFormTitle}>Counter-Proposal</Text>

            <View style={styles.counterField}>
              <Text style={styles.counterFieldLabel}>Counter Rate (₹/session)</Text>
              <TextInput
                style={styles.counterInput}
                value={counterForm.counter_rate_inr}
                onChangeText={(text) =>
                  setCounterForm({ ...counterForm, counter_rate_inr: text.replace(/[^0-9]/g, '') })
                }
                keyboardType="numeric"
                placeholder="Rate per session"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.counterField}>
              <Text style={styles.counterFieldLabel}>Sessions per Week (1-7)</Text>
              <TextInput
                style={styles.counterInput}
                value={counterForm.counter_sessions_per_week}
                onChangeText={(text) =>
                  setCounterForm({ ...counterForm, counter_sessions_per_week: text.replace(/[^0-9]/g, '') })
                }
                keyboardType="numeric"
                placeholder="1-7"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.counterField}>
              <Text style={styles.counterFieldLabel}>Total Sessions</Text>
              <TextInput
                style={styles.counterInput}
                value={counterForm.counter_total_sessions}
                onChangeText={(text) =>
                  setCounterForm({ ...counterForm, counter_total_sessions: text.replace(/[^0-9]/g, '') })
                }
                keyboardType="numeric"
                placeholder="Total number of sessions"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.counterField}>
              <Text style={styles.counterFieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.counterInput, styles.counterNotesInput]}
                value={counterForm.counter_notes}
                onChangeText={(text) => setCounterForm({ ...counterForm, counter_notes: text })}
                placeholder="Any message for the parent..."
                placeholderTextColor={Colors.textLight}
                multiline
                maxLength={500}
              />
            </View>

            <View style={styles.counterFormActions}>
              <Pressable
                style={[styles.actionBtn, styles.counterSubmitBtn]}
                onPress={handleCounterSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.counterSubmitBtnText}>Send Counter</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.counterCancelBtn]}
                onPress={() => setCounterForm(null)}
              >
                <Text style={styles.counterCancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading proposals...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with pending count badge */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Proposals</Text>
        {pendingProposals.length > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingProposals.length}</Text>
          </View>
        )}
      </View>

      {/* Pending proposals (action required) */}
      {pendingProposals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action Required</Text>
          {pendingProposals.map((p) => renderProposalCard(p, true))}
        </View>
      )}

      {/* Countered proposals (awaiting parent) */}
      {counteredProposals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Awaiting Parent Response</Text>
          {counteredProposals.map((p) => (
            <View key={p.id} style={[styles.proposalCard, { borderLeftColor: Colors.secondary }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.parentName}>{p.parent_name || 'Parent'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: Colors.secondary + '20' }]}>
                  <Text style={[styles.statusText, { color: Colors.secondary }]}>Waiting for parent</Text>
                </View>
              </View>
              <Text style={styles.childLabel}>Child (consent pending)</Text>
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Your counter rate</Text>
                  <Text style={styles.detailValue}>₹{p.counter_rate_inr}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Sessions/week</Text>
                  <Text style={styles.detailValue}>{p.counter_sessions_per_week}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total sessions</Text>
                  <Text style={styles.detailValue}>{p.counter_total_sessions}</Text>
                </View>
              </View>
              {p.counter_notes ? (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Your notes:</Text>
                  <Text style={styles.notesText}>{p.counter_notes}</Text>
                </View>
              ) : null}
              <Text style={styles.dateText}>{formatDate(p.created_at)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Historical proposals (collapsible) */}
      {historicalProposals.length > 0 && (
        <View style={styles.section}>
          <Pressable
            style={styles.historySectionHeader}
            onPress={() => setHistoryExpanded(!historyExpanded)}
          >
            <Text style={styles.sectionTitle}>History</Text>
            <Text style={styles.expandIcon}>{historyExpanded ? '▾' : '▸'}</Text>
          </Pressable>
          {historyExpanded &&
            historicalProposals.map((p) => renderProposalCard(p, false))}
        </View>
      )}

      {/* Empty state */}
      {proposals.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No proposals yet</Text>
          <Text style={styles.emptySubtitle}>
            When parents propose sessions, they'll appear here for you to review.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  pendingBadge: {
    marginLeft: 10,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  expandIcon: {
    fontSize: 16,
    color: Colors.textLight,
  },

  // Proposal card
  proposalCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  childLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginBottom: 12,
  },

  // Details row
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },

  // Notes
  notesSection: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },

  // Date
  dateText: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.success,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  rejectBtn: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  counterBtn: {
    backgroundColor: Colors.secondary + '20',
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  counterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // Counter form
  counterFormContainer: {
    marginTop: 14,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
  },
  counterFormTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 14,
  },
  counterField: {
    marginBottom: 12,
  },
  counterFieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 6,
  },
  counterInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  counterNotesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  counterFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  counterSubmitBtn: {
    backgroundColor: Colors.secondary,
    flex: 2,
  },
  counterSubmitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  counterCancelBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
  },
  counterCancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});
