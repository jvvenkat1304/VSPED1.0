import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import EducatorProposalsInbox from '../../components/EducatorProposalsInbox';
import EducatorSessions from '../../components/EducatorSessions';
import EducatorOfferings from '../../components/EducatorOfferings';
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

type ActiveView = 'dashboard' | 'proposals' | 'sessions' | 'subscription' | 'settings' | 'profile' | 'clients' | 'offerings';

// --- Educator Profile View (read-only) ---
function EducatorProfileView({ sessionToken }: { sessionToken: string }) {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${sessionToken}` } },
        });
        const { data } = await supabase.from('educator_profiles').select('*').single();
        setProfile(data);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, [sessionToken]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>;
  if (!profile) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Profile not found</Text></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.primary, marginBottom: 16 }}>My Profile</Text>
      <View style={{ backgroundColor: Colors.card, borderRadius: 14, padding: 18, gap: 12 }}>
        <View><Text style={{ fontSize: 12, color: Colors.textLight }}>RCI Number</Text><Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text }}>{(profile.rci_number as string) || 'Not set'}</Text></View>
        <View><Text style={{ fontSize: 12, color: Colors.textLight }}>Subjects</Text><Text style={{ fontSize: 14, color: Colors.text }}>{Array.isArray(profile.subjects) ? (profile.subjects as string[]).join(', ') : 'Not set'}</Text></View>
        <View><Text style={{ fontSize: 12, color: Colors.textLight }}>Languages</Text><Text style={{ fontSize: 14, color: Colors.text }}>{Array.isArray(profile.languages) ? (profile.languages as string[]).join(', ') : 'Not set'}</Text></View>
        <View><Text style={{ fontSize: 12, color: Colors.textLight }}>City</Text><Text style={{ fontSize: 14, color: Colors.text }}>{(profile.city as string) || 'Not set'}</Text></View>
        <View><Text style={{ fontSize: 12, color: Colors.textLight }}>Session Rate</Text><Text style={{ fontSize: 16, fontWeight: '700', color: Colors.accent }}>₹{profile.session_rate_inr || 0}/session</Text></View>
        <View><Text style={{ fontSize: 12, color: Colors.textLight }}>Min Rate (private)</Text><Text style={{ fontSize: 14, color: Colors.text }}>₹{profile.min_rate_inr || profile.session_rate_inr || 0}</Text></View>
        <View><Text style={{ fontSize: 12, color: Colors.textLight }}>Verification</Text><Text style={{ fontSize: 14, color: Colors.success }}>{profile.verification_status === 'verified' ? '✅ Verified' : profile.verification_status === 'provisionally_verified' ? '⏳ Provisional' : '⏳ Pending'}</Text></View>
        <View><Text style={{ fontSize: 12, color: Colors.textLight }}>Subscription</Text><Text style={{ fontSize: 14, color: profile.subscription_status === 'active' ? Colors.success : Colors.accent }}>{profile.subscription_status === 'active' ? '✅ Active' : '⏳ ' + (profile.subscription_status || 'none')}</Text></View>
      </View>
      <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 16, textAlign: 'center', fontStyle: 'italic' }}>Profile editing coming in next update</Text>
    </ScrollView>
  );
}

// --- Educator Clients View (children with active consent) ---
function EducatorClientsView({ sessionToken }: { sessionToken: string }) {
  const [clients, setClients] = useState<{ child_id: string; granted_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${sessionToken}` } },
        });
        const { data } = await supabase
          .from('consent_grants')
          .select('child_id, granted_at')
          .is('revoked_at', null);
        setClients(data || []);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, [sessionToken]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.primary, marginBottom: 16 }}>My Clients</Text>
      {clients.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>👨‍👧‍👦</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 8 }}>No clients yet</Text>
          <Text style={{ fontSize: 14, color: Colors.textLight, textAlign: 'center' }}>When a parent accepts your proposal, their child will appear here with consent-granted access.</Text>
        </View>
      ) : (
        clients.map((c, i) => (
          <View key={i} style={{ backgroundColor: Colors.card, borderRadius: 14, padding: 18, marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.text }}>Client #{i + 1}</Text>
            <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 4 }}>Access granted: {new Date(c.granted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <Text style={{ fontSize: 12, color: Colors.success, marginTop: 4 }}>✅ Active consent</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

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
        {activeView === 'profile' && <EducatorProfileView sessionToken={sessionToken} />}
        {activeView === 'clients' && <EducatorClientsView sessionToken={sessionToken} />}
        {activeView === 'offerings' && <EducatorOfferings sessionToken={sessionToken} />}
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
        <Pressable style={styles.actionCard} onPress={() => setActiveView('profile')}>
          <Text style={styles.actionEmoji}>👤</Text>
          <Text style={styles.actionTitle}>My Profile</Text>
          <Text style={styles.actionDesc}>Edit profile & RCI details</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => setActiveView('clients')}>
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

        <Pressable style={styles.actionCard} onPress={() => setActiveView('offerings')}>
          <Text style={styles.actionEmoji}>📊</Text>
          <Text style={styles.actionTitle}>Offerings</Text>
          <Text style={styles.actionDesc}>Schedule & availability setup</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => setActiveView('clients')}>
          <Text style={styles.actionEmoji}>🔐</Text>
          <Text style={styles.actionTitle}>Consent Requests</Text>
          <Text style={styles.actionDesc}>View data access grants</Text>
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
