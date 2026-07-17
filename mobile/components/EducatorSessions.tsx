import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import VideoSession from './VideoSession';

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

interface EducatorSessionsProps {
  sessionToken: string;
}

interface Session {
  id: string;
  start_time: string;
  status: string;
  child_name: string | null;
  consent_active: boolean;
}

type TabType = 'upcoming' | 'past';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  proposed: { label: 'Proposed', color: Colors.accent, bg: '#fef9f0' },
  accepted: { label: 'Accepted', color: Colors.success, bg: '#eef7f4' },
  in_progress: { label: 'In Progress', color: Colors.primary, bg: '#edf3f8' },
  completed: { label: 'Completed', color: Colors.textLight, bg: '#f3f4f6' },
  cancelled: { label: 'Cancelled', color: Colors.warning, bg: '#fef2f2' },
};

export default function EducatorSessions({ sessionToken }: EducatorSessionsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [activeVideoSessionId, setActiveVideoSessionId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionToken}` } },
      });

      const { data, error } = await supabase
        .from('sessions')
        .select('id, start_time, status, child_id')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching sessions:', error.message);
        setSessions([]);
        return;
      }

      if (!data || data.length === 0) {
        setSessions([]);
        return;
      }

      // Check consent status for each session's child
      // For privacy: only show child name if consent is active
      const childIds = [...new Set(data.map((s) => s.child_id).filter(Boolean))];
      let consentMap: Record<string, boolean> = {};

      if (childIds.length > 0) {
        const { data: consents } = await supabase
          .from('consent_grants')
          .select('child_id')
          .in('child_id', childIds)
          .is('revoked_at', null);

        if (consents) {
          consents.forEach((c) => {
            consentMap[c.child_id] = true;
          });
        }
      }

      const mapped: Session[] = data.map((s) => ({
        id: s.id,
        start_time: s.start_time,
        status: s.status || 'proposed',
        child_name: null, // Child name fetched separately via get-child when consent is active
        consent_active: consentMap[s.child_id] || false,
      }));

      setSessions(mapped);
    } catch (err) {
      console.error('Error loading sessions:', err);
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

  const now = new Date();
  const upcomingSessions = sessions.filter(
    (s) => new Date(s.start_time) >= now && s.status !== 'completed' && s.status !== 'cancelled'
  );
  const pastSessions = sessions.filter(
    (s) => new Date(s.start_time) < now || s.status === 'completed' || s.status === 'cancelled'
  );

  const displayedSessions = activeTab === 'upcoming' ? upcomingSessions : pastSessions;

  function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ' at ' + date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  function renderStatusBadge(status: string) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.proposed;
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Sessions</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming ({upcomingSessions.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Past ({pastSessions.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Video Session overlay */}
        {activeVideoSessionId && (
          <View style={styles.videoOverlay}>
            <Pressable
              style={styles.videoBackBtn}
              onPress={() => setActiveVideoSessionId(null)}
            >
              <Text style={styles.videoBackText}>← Back to Sessions</Text>
            </Pressable>
            <VideoSession
              sessionId={activeVideoSessionId}
              sessionToken={sessionToken}
              onEnd={() => {
                setActiveVideoSessionId(null);
                fetchSessions();
              }}
            />
          </View>
        )}

        {!activeVideoSessionId && displayedSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'upcoming'
                ? 'Accept a proposal to get started.'
                : 'Completed sessions will appear here.'}
            </Text>
          </View>
        ) : !activeVideoSessionId ? (
          displayedSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.cardTop}>
                <View style={styles.dateSection}>
                  <Text style={styles.dateText}>{formatDateTime(session.start_time)}</Text>
                  <Text style={styles.durationText}>
                    ⏱ {session.duration_minutes || 60} min
                  </Text>
                </View>
                {renderStatusBadge(session.status)}
              </View>

              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Client:</Text>
                <Text style={styles.clientValue}>
                  {session.consent_active ? 'Client' : 'Client (consent pending)'}
                </Text>
              </View>

              {/* Start/Join Session button for accepted or in_progress sessions */}
              {(session.status === 'accepted' || session.status === 'in_progress') && (
                <Pressable
                  style={[
                    styles.videoButton,
                    session.status === 'in_progress' && styles.videoButtonActive,
                  ]}
                  onPress={() => setActiveVideoSessionId(session.id)}
                >
                  <Text style={styles.videoButtonText}>
                    {session.status === 'in_progress' ? '🟢 Rejoin Session' : '🎥 Start Session'}
                  </Text>
                </Pressable>
              )}
            </View>
          ))
        ) : null}
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
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  tabTextActive: {
    color: Colors.white,
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

  // Session Card
  sessionCard: {
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateSection: {
    flex: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  durationText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  clientLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  clientValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },

  // Video Session
  videoButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  videoButtonActive: {
    backgroundColor: Colors.success,
  },
  videoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  videoOverlay: {
    paddingBottom: 20,
  },
  videoBackBtn: {
    paddingVertical: 10,
    marginBottom: 12,
  },
  videoBackText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
});
