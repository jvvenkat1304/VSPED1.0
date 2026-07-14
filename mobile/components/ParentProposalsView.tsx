import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';

const BASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

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

interface ParentProposalsViewProps {
  sessionToken: string;
}

interface Proposal {
  id: string;
  status: string;
  educator_name?: string;
  sessions_per_week: number;
  total_sessions: number;
  proposed_rate_inr: number;
  counter_rate_inr?: number;
  counter_sessions_per_week?: number;
  counter_total_sessions?: number;
  notes?: string;
  counter_notes?: string;
  created_at: string;
  expires_at: string;
  payment_status?: string;
}

type ProposalStatus = 'pending' | 'accepted' | 'parent_accepted' | 'rejected' | 'countered' | 'expired' | 'withdrawn' | 'paid';

function getStatusColor(status: string): string {
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

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'parent_accepted':
      return 'Accepted';
    case 'rejected':
      return 'Rejected';
    case 'countered':
      return 'Countered';
    case 'expired':
      return 'Expired';
    case 'withdrawn':
      return 'Withdrawn';
    case 'paid':
      return '✓ Paid';
    default:
      return status;
  }
}

export default function ParentProposalsView({ sessionToken }: ParentProposalsViewProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/get-proposals?role=parent`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'apikey': ANON_KEY,
        },
      });

      const data = await response.json();
      if (data.success && data.proposals) {
        // Sort by created_at descending (most recent first)
        const sorted = data.proposals.sort(
          (a: Proposal, b: Proposal) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setProposals(sorted);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load proposals. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProposals();
  }, [fetchProposals]);

  async function handleRespondCounter(proposalId: string, action: 'accept' | 'withdraw') {
    setActionLoading(proposalId);
    try {
      const response = await fetch(`${BASE_URL}/respond-counter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({ proposal_id: proposalId, action }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert(
          'Success',
          action === 'accept'
            ? 'Counter-proposal accepted! You can now complete payment.'
            : 'Proposal withdrawn successfully.'
        );
        fetchProposals();
      } else {
        Alert.alert('Error', data.error || 'Action failed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCompletePayment(proposalId: string) {
    try {
      const response = await fetch(`${BASE_URL}/create-payment-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({ proposal_id: proposalId }),
      });

      const data = await response.json();

      if (data.success && data.checkout_url) {
        const canOpen = await Linking.canOpenURL(data.checkout_url);
        if (canOpen) {
          await Linking.openURL(data.checkout_url);
          Alert.alert(
            'Complete Payment',
            'Complete payment in your browser. Your booking will confirm automatically.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', 'Unable to open payment page. Please try again.');
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to initiate payment. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    }
  }

  function confirmWithdraw(proposalId: string) {
    Alert.alert(
      'Withdraw Proposal',
      'Are you sure you want to withdraw from this counter-offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => handleRespondCounter(proposalId, 'withdraw') },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading proposals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Proposals</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {proposals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No proposals yet</Text>
            <Text style={styles.emptySubtitle}>
              Browse educators and propose a session package to get started.
            </Text>
          </View>
        ) : (
          proposals.map((proposal) => (
            <View key={proposal.id} style={styles.proposalCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.educatorInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(proposal.educator_name || 'E').charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.educatorName}>
                    {proposal.educator_name || 'Educator'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(proposal.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(proposal.status) }]}>
                    {getStatusLabel(proposal.status)}
                  </Text>
                </View>
              </View>

              {/* Proposal Details */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Sessions/Week</Text>
                  <Text style={styles.detailValue}>{proposal.sessions_per_week}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total Sessions</Text>
                  <Text style={styles.detailValue}>{proposal.total_sessions}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Rate</Text>
                  <Text style={styles.detailValue}>₹{proposal.proposed_rate_inr}</Text>
                </View>
              </View>

              {/* Counter-Proposal Comparison (for countered status) */}
              {proposal.status === 'countered' && proposal.counter_rate_inr && (
                <View style={styles.counterSection}>
                  <Text style={styles.counterTitle}>Counter-Offer Received</Text>
                  <View style={styles.comparisonContainer}>
                    {/* Original Terms */}
                    <View style={styles.comparisonSide}>
                      <Text style={styles.comparisonLabel}>Your Proposal</Text>
                      <Text style={styles.comparisonValue}>₹{proposal.proposed_rate_inr}/session</Text>
                      <Text style={styles.comparisonDetail}>{proposal.sessions_per_week}x/week</Text>
                      <Text style={styles.comparisonDetail}>{proposal.total_sessions} total</Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.comparisonDivider}>
                      <Text style={styles.vsText}>vs</Text>
                    </View>

                    {/* Counter Terms */}
                    <View style={styles.comparisonSide}>
                      <Text style={styles.comparisonLabel}>Counter Terms</Text>
                      <Text style={[styles.comparisonValue, { color: Colors.secondary }]}>
                        ₹{proposal.counter_rate_inr}/session
                      </Text>
                      <Text style={styles.comparisonDetail}>
                        {proposal.counter_sessions_per_week}x/week
                      </Text>
                      <Text style={styles.comparisonDetail}>
                        {proposal.counter_total_sessions} total
                      </Text>
                    </View>
                  </View>

                  {proposal.counter_notes ? (
                    <Text style={styles.counterNotes}>"{proposal.counter_notes}"</Text>
                  ) : null}

                  {/* Action Buttons for countered proposals */}
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.acceptButton, actionLoading === proposal.id && styles.buttonDisabled]}
                      onPress={() => handleRespondCounter(proposal.id, 'accept')}
                      disabled={actionLoading === proposal.id}
                    >
                      {actionLoading === proposal.id ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.acceptButtonText}>Accept Counter</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.withdrawButton, actionLoading === proposal.id && styles.buttonDisabled]}
                      onPress={() => confirmWithdraw(proposal.id)}
                      disabled={actionLoading === proposal.id}
                    >
                      <Text style={styles.withdrawButtonText}>Withdraw</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Payment Button (for accepted/parent_accepted with pending payment) */}
              {(proposal.status === 'accepted' || proposal.status === 'parent_accepted') &&
                proposal.payment_status === 'pending' && (
                  <View style={styles.paymentSection}>
                    <Text style={styles.paymentPrompt}>
                      Educator accepted! Complete payment to confirm booking.
                    </Text>
                    <Pressable
                      style={styles.paymentButton}
                      onPress={() => handleCompletePayment(proposal.id)}
                    >
                      <Text style={styles.paymentButtonText}>Complete Payment</Text>
                    </Pressable>
                  </View>
                )}

              {/* Date footer */}
              <Text style={styles.dateText}>
                {new Date(proposal.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
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
  },

  // Proposal Card
  proposalCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
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
    marginBottom: 14,
  },
  educatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  educatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Details Row
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },

  // Counter Section
  counterSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  counterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 12,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  comparisonSide: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  comparisonValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  comparisonDetail: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  comparisonDivider: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },
  counterNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.textLight,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: Colors.success,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  withdrawButton: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Payment Section
  paymentSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  paymentPrompt: {
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
  },
  paymentButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignItems: 'center',
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },

  // Date Footer
  dateText: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 10,
    textAlign: 'right',
  },
});
