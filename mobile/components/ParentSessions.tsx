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
  white: '#ffffff',
};

interface ParentSessionsProps {
  sessionToken: string;
}

interface Session {
  id: string;
  start_time: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  proposed: { label: 'Proposed', color: Colors.accent, bg: '#fef9f0' },
  accepted: { label: 'Scheduled', color: Colors.success, bg: '#eef7f4' },
  in_progress: { label: 'In Progress', color: Colors.primary, bg: '#edf3f8' },
  completed: { label: 'Completed', color: Colors.textLight, bg: '#f3f4f6' },
  cancelled: { label: 'Cancelled', color: Colors.warning, bg: '#fef2f2' },
};

export default function ParentSessions({ sessionToken }: ParentSessionsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVideoSessionId, setActiveVideoSessionId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
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
        return;
      }

      const mapped: Session[] = (data || []).map((s) => ({
        id: s.id,
        start_time: s.start_time,
        status: s.status || 'proposed',
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

  const activeSessions = sessions.filter(
    (s) => s.status === 'accepted' || s.status === 'in_progress'
  );
  const pastSessions = sessions.filter(
    (s) => s.status === 'completed' || s.status === 'cancelled'
  );

  function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) +
      ' at ' +
      date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    );
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

        {!activeVideoSessionId && (
          <>
            {/* Active/Upcoming Sessions */}
            {activeSessions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Sessions</Text>
                {activeSessions.map((session) => (
                  <View key={session.id} style={styles.sessionCard}>
                    <View style={styles.cardTop}>
                      <View style={styles.dateSection}>
                        <Text style={styles.dateText}>
                          {formatDateTime(session.start_time)}
                        </Text>
                        <Text style={styles.durationText}>
                          ⏱ {session.duration_minutes || 60} min
                        </Text>
                      </View>
                      {renderStatusBadge(session.status)}
                    </View>

                    {/* Join Session button */}
                    <Pressable
                      style={[
                        styles.videoButton,
                        session.status === 'in_progress' && styles.videoButtonActive,
                      ]}
                      onPress={() => setActiveVideoSessionId(session.id)}
                    >
                      <Text style={styles.videoButtonText}>
                        {session.status === 'in_progress'
                          ? '🟢 Join Session'
                          : '🎥 Join When Ready'}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Past Sessions */}
            {pastSessions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past Sessions</Text>
                {pastSessions.map((session) => (
                  <View key={session.id} style={styles.sessionCard}>
                    <View style={styles.cardTop}>
                      <View style={styles.dateSection}>
                        <Text style={styles.dateText}>
                          {formatDateTime(session.start_time)}
                        </Text>
                        <Text style={styles.durationText}>
                          ⏱ {session.duration_minutes || 60} min
                        </Text>
                      </View>
                      {renderStatusBadge(session.status)}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {sessions.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>No sessions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Sessions will appear here once a proposal is accepted and paid.
                </Text>
              </View>
            )}
          </>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
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
    marginBottom: 4,
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

  // Video button
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
});
