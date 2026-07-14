import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import EducatorProposalsInbox from '../../components/EducatorProposalsInbox';
import EducatorSessions from '../../components/EducatorSessions';
import SubscriptionCheckout from '../../components/SubscriptionCheckout';
import Settings from '../../components/Settings';
import { useAuthStore } from '../../store/authStore';

const SUPABASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  secondary: '#7fb2b8',
  success: '#9caf88',
  text: '#333333',
  textLight: '#6b7280',
  card: '#ffffff',
};

type ActiveView = 'dashboard' | 'proposals' | 'sessions' | 'subscription' | 'settings';

export default function EducatorDashboard() {
  const sessionToken = useAuthStore(state => state.sessionToken) || '';
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [subscriptionStatus, setSubscriptionStatus] = useState('none');

  useEffect(() => {
    fetchProfileStatus();
  }, [sessionToken]);

  async function fetchProfileStatus() {
    if (!sessionToken) return;
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionToken}` } },
      });
      const { data } = await supabase
        .from('educator_profiles')
        .select('verification_status, subscription_status')
        .single();
      if (data) {
        setVerificationStatus(data.verification_status || 'pending');
        setSubscriptionStatus(data.subscription_status || 'none');
      }
    } catch {
      // Silently fail
    }
  }

  // Render inline views based on active state
  if (activeView !== 'dashboard') {
    return (
      <View style={styles.container}>
        <View style={styles.proposalsHeader}>
          <Pressable style={styles.backBtn} onPress={() => setActiveView('dashboard')}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
        </View>
        {activeView === 'proposals' && <EducatorProposalsInbox sessionToken={sessionToken} />}
        {activeView === 'sessions' && <EducatorSessions sessionToken={sessionToken} />}
        {activeView === 'subscription' && <SubscriptionCheckout sessionToken={sessionToken} />}
        {activeView === 'settings' && <Settings />}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, Educator 🎓</Text>
            <Text style={styles.subtitle}>Manage your practice</Text>
          </View>
          {/* Settings Icon */}
          <Pressable
            style={styles.iconButton}
            onPress={() => setActiveView('settings')}
          >
            <Text style={styles.iconEmoji}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.grid}>
        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>👤</Text>
          <Text style={styles.actionTitle}>My Profile</Text>
          <Text style={styles.actionDesc}>Edit profile & RCI details</Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>👨‍👧‍👦</Text>
          <Text style={styles.actionTitle}>My Clients</Text>
          <Text style={styles.actionDesc}>Children you work with</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => setActiveView('sessions')}>
          <Text style={styles.actionEmoji}>📅</Text>
          <Text style={styles.actionTitle}>Sessions</Text>
          <Text style={styles.actionDesc}>Propose & manage sessions</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => setActiveView('subscription')}>
          <Text style={styles.actionEmoji}>💳</Text>
          <Text style={styles.actionTitle}>Subscription</Text>
          <Text style={styles.actionDesc}>Manage your plan</Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>📊</Text>
          <Text style={styles.actionTitle}>Offerings</Text>
          <Text style={styles.actionDesc}>Create packages & sessions</Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>🔐</Text>
          <Text style={styles.actionTitle}>Consent Requests</Text>
          <Text style={styles.actionDesc}>Request access to child data</Text>
        </Pressable>

        {/* Proposals Card */}
        <Pressable style={[styles.actionCard, styles.proposalsCard]} onPress={() => setActiveView('proposals')}>
          <Text style={styles.actionEmoji}>📩</Text>
          <Text style={styles.actionTitle}>Proposals</Text>
          <Text style={styles.actionDesc}>Review parent session proposals</Text>
        </Pressable>
      </View>

      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Profile Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusItem}>
            RCI Verified: {verificationStatus === 'verified' ? '✅ Verified' : verificationStatus === 'provisionally_verified' ? '⏳ Provisional' : '⏳ Pending'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusItem}>
            Subscription: {subscriptionStatus === 'active' ? '✅ Active' : subscriptionStatus === 'pending' ? '⏳ Payment Pending' : '⏳ Not active'}
          </Text>
        </View>
        {(verificationStatus !== 'verified' && verificationStatus !== 'provisionally_verified') || subscriptionStatus !== 'active' ? (
          <Text style={styles.statusNote}>
            Complete verification and subscribe to appear in parent search.
          </Text>
        ) : (
          <Text style={[styles.statusNote, { color: Colors.success }]}>
            ✓ You are visible to parents in the marketplace.
          </Text>
        )}
      </View>
    </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconEmoji: {
    fontSize: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24,
  },
  actionCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  proposalsCard: {
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: Colors.textLight,
  },
  statusCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e8e5df',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  statusRow: {
    marginBottom: 6,
  },
  statusItem: {
    fontSize: 14,
    color: Colors.textLight,
  },
  statusNote: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 10,
    fontStyle: 'italic',
  },
  // Inline view header
  proposalsHeader: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
