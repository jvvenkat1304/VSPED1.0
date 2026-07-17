import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../../store/authStore';

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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  proposed: { label: 'Proposed', color: Colors.accent, bg: '#fef9f0' },
  accepted: { label: 'Scheduled', color: Colors.success, bg: '#eef7f4' },
  in_progress: { label: '🟢 Live', color: Colors.primary, bg: '#edf3f8' },
  completed: { label: 'Completed', color: Colors.textLight, bg: '#f3f4f6' },
  cancelled: { label: 'Cancelled', color: Colors.warning, bg: '#fef2f2' },
};

interface Session {
  id: string;
  start_time: string;
  status: string;
}

function getNext7Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getMonthYear(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function CalendarScreen() {
  const sessionToken = useAuthStore(state => state.sessionToken) || '';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const days = getNext7Days();
  const today = days[0];

  const fetchSessions = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionToken}` } },
      });

      // Fetch sessions for the next 7 days
      const startRange = new Date(days[0]);
      const endRange = new Date(days[6]);
      endRange.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('sessions')
        .select('id, start_time, status')
        .gte('start_time', startRange.toISOString())
        .lte('start_time', endRange.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching sessions:', error.message);
        setSessions([]);
      } else {
        setSessions(
          (data || []).map(s => ({
            id: s.id,
            start_time: s.start_time,
            status: s.status || 'proposed',
          }))
        );
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

  // Filter sessions for the selected day
  const sessionsForDay = sessions.filter(s => {
    const sessionDate = new Date(s.start_time);
    return isSameDay(sessionDate, selectedDate);
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading schedule...</Text>
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
        {/* Header */}
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.monthYear}>{getMonthYear(selectedDate)}</Text>

        {/* Week selector */}
        <View style={styles.weekRow}>
          {days.map((day, index) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            const hasSession = sessions.some(s => isSameDay(new Date(s.start_time), day));

            return (
              <Pressable
                key={day.toISOString()}
                style={styles.dayColumn}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {DAY_NAMES[day.getDay()]}
                </Text>
                <View
                  style={[
                    styles.dayCircle,
                    isToday && !isSelected && styles.dayCircleToday,
                    isSelected && styles.dayCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday && !isSelected && styles.dayNumberToday,
                      isSelected && styles.dayNumberSelected,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
                {hasSession && <View style={styles.dot} />}
              </Pressable>
            );
          })}
        </View>

        {/* Sessions for selected day */}
        <View style={styles.sessionsSection}>
          <Text style={styles.sectionTitle}>
            {isSameDay(selectedDate, today) ? "Today's Sessions" : `Sessions for ${DAY_NAMES[selectedDate.getDay()]} ${selectedDate.getDate()}`}
          </Text>

          {sessionsForDay.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No sessions scheduled for this day</Text>
            </View>
          ) : (
            sessionsForDay.map(session => {
              const config = STATUS_CONFIG[session.status] || STATUS_CONFIG.proposed;
              const canJoin = session.status === 'in_progress' || session.status === 'accepted';

              return (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.sessionTime}>{formatTime(session.start_time)}</Text>
                      <View style={[styles.badge, { backgroundColor: config.bg }]}>
                        <Text style={[styles.badgeText, { color: config.color }]}>
                          {config.label}
                        </Text>
                      </View>
                    </View>
                    {canJoin && (
                      <Pressable style={styles.joinBtn}>
                        <Text style={styles.joinBtnText}>Join</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textLight },

  // Header
  title: { fontSize: 28, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  monthYear: { fontSize: 15, color: Colors.textLight, marginBottom: 24 },

  // Week selector
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dayColumn: { alignItems: 'center', flex: 1 },
  dayName: { fontSize: 11, fontWeight: '600', color: Colors.textLight, marginBottom: 6 },
  dayNameSelected: { color: Colors.primary },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleToday: { backgroundColor: Colors.accent + '20' },
  dayCircleSelected: { backgroundColor: Colors.primary },
  dayNumber: { fontSize: 15, fontWeight: '600', color: Colors.text },
  dayNumberToday: { color: Colors.accent },
  dayNumberSelected: { color: Colors.white },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    marginTop: 4,
  },

  // Sessions section
  sessionsSection: { marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginBottom: 14 },

  // Empty state
  emptyDay: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textLight, textAlign: 'center' },

  // Session card
  sessionCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionTime: { fontSize: 16, fontWeight: '600', color: Colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  joinBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white },
});
