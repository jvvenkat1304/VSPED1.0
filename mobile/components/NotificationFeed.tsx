import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { Colors, Fonts, Spacing, BorderRadius } from '../constants/theme';

const SUPABASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

// --- Types ---

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: { proposal_id?: string; [key: string]: unknown };
  read_at: string | null;
  created_at: string;
}

interface NotificationFeedProps {
  sessionToken: string;
}

// --- Relative time helper ---

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  // For older dates, show a short date
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-IN', { month: 'short' });
  return `${day} ${month}`;
}

// --- Component ---

export default function NotificationFeed({ sessionToken }: NotificationFeedProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Create an authenticated Supabase client using the session token
  const getSupabaseClient = useCallback(() => {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      },
    });
  }, [sessionToken]);

  useEffect(() => {
    fetchNotifications();
  }, [sessionToken]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error.message);
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const client = getSupabaseClient();

      const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error.message);
        return;
      }

      // Update local state to reflect the change
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    } catch (err) {
      console.error('Unexpected error marking as read:', err);
    }
  }

  function handleNotificationPress(notification: Notification) {
    // Mark as read if unread
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    // Navigation to proposal can be added later using metadata.proposal_id
  }

  // --- Render ---

  function renderNotificationItem({ item }: { item: Notification }) {
    const isUnread = !item.read_at;

    return (
      <Pressable
        style={[styles.notificationCard, isUnread && styles.notificationCardUnread]}
        onPress={() => handleNotificationPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${isUnread ? 'Unread notification: ' : ''}${item.title}. ${item.body}`}
      >
        {isUnread && <View style={styles.unreadIndicator} />}
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, isUnread && styles.notificationTitleUnread]}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTimestamp}>
            {getRelativeTime(item.created_at)}
          </Text>
        </View>
      </Pressable>
    );
  }

  function renderEmptyState() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyText}>No notifications yet</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.sm,
  },
  notificationCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationCardUnread: {
    backgroundColor: '#f7f5ef',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginRight: Spacing.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  notificationTitleUnread: {
    color: Colors.primary,
  },
  notificationBody: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTimestamp: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textLight,
  },
});
