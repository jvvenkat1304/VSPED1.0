import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../../store/authStore';
import VideoSession from '../../components/VideoSession';

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

interface Session {
  id: string;
  start_time: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  proposed: { label: 'Proposed', color: Colors.accent, bg: '#fef9f0' },
  accepted: { label: 'Scheduled', color: Colors.success, bg: '#eef7f4' },
  in_progress: { label: '🟢 Live', color: Colors.primary, bg: '#edf3f8' },
  completed: { label: 'Completed', color: Colors.textLight, bg: '#f3f4f6' },
  cancelled: { label: 'Cancelled', color: Colors.warning, bg: '#fef2f2' },
};

export default function ClassroomScreen() {
  const sessionToken = useAuthStore(state => state.sessionToken) || '';
  const role = useAuthStore(state => state.role);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionToken}` } },
      });

      const { data, error } = await supabase
        .from('sessions')
        .select('id, start_time, status')
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error.message);
        setSessions([]);
      } else {
        setSessions((data || []).map(s => ({
          id: s.id,
          start_time: s.start_time,
          status: s.status || 'proposed',
        })));
      }
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions();
  }, [fetchSessions]);

  const activeSessions = sessions.filter(
    s => s.status === 'accepted' || s.status === 'in_progress'
  );
  const completedSessions = sessions.filter(
    s => s.status === 'completed' || s.status === 'cancelled'
  );

  function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
      ' at ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading classroom...</Text>
      </View>
    );
  }

  // If a video session is active, show it
  if (activeVideoId) {
    return (
      <View style={styles.container}>
        <View style={styles.videoHeader}>
          <Pressable onPress={() => setActiveVideoId(null)}>
            <Text style={styles.backText}>← Back to Classroom</Text>
          </Pressable>
        </View>
        <View style={styles.videoContainer}>
          <VideoSession
            sessionId={activeVideoId}
            sessionToken={sessionToken}
            onEnd={() => { setActiveVideoId(null); fetchSessions(); }}
          />
        </View>
      </View>
    );
  }

  // No sessions yet
  if (sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📚</Text>
        <Text style={styles.emptyTitle}>Your Classroom</Text>
        <Text style={styles.emptySubtitle}>
          {role === 'special_educator'
            ? 'Sessions will appear here once parents propose and pay for sessions with you.'
            : 'Find an educator and propose a session package to get started.'}
        </Text>
        {role !== 'special_educator' && (
          <Pressable style={styles.ctaButton} onPress={() => router.push('/dashboard/search')}>
            <Text style={styles.ctaText}>Find an Educator</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <Text style={styles.title}>Classroom</Text>
        <Text style={styles.subtitle}>Your sessions and video calls</Text>

        {/* Active / Upcoming Sessions */}
        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Sessions</Text>
            {activeSessions.map(session => (
              <View key={session.id} style={[styles.sessionCard, session.status === 'in_progress' && styles.liveCard]}>
                <View style={styles.cardTop}>
                  <Text style={styles.dateText}>{formatDateTime(session.start_time)}</Text>
                  <View style={[styles.badge, { backgroundColor: STATUS_CONFIG[session.status]?.bg || '#f3f4f6' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_CONFIG[session.status]?.color || Colors.textLight }]}>
                      {STATUS_CONFIG[session.status]?.label || session.status}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.videoBtn, session.status === 'in_progress' && styles.videoBtnLive]}
                  onPress={() => setActiveVideoId(session.id)}
                >
                  <Text style={styles.videoBtnText}>
                    {session.status === 'in_progress' ? '🟢 Join Live Session' : '🎥 Start Session'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Completed Sessions */}
        {completedSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Sessions</Text>
            {completedSessions.map(session => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.dateText}>{formatDateTime(session.start_time)}</Text>
                  <View style={[styles.badge, { backgroundColor: STATUS_CONFIG[session.status]?.bg || '#f3f4f6' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_CONFIG[session.status]?.color || Colors.textLight }]}>
                      {STATUS_CONFIG[session.status]?.label || session.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textLight },
  title: { fontSize: 28, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textLight, marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  sessionCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  liveCard: { borderWidth: 1.5, borderColor: Colors.success },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  videoBtn: {
    backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12,
  },
  videoBtnLive: { backgroundColor: Colors.success },
  videoBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white },
  // Video overlay
  videoHeader: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  videoContainer: { flex: 1, paddingHorizontal: 20 },
  // Empty state
  emptyContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  ctaButton: { backgroundColor: Colors.accent, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
