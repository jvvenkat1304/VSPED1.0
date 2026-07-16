import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';

const SUPABASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';
const BASE_URL = `${SUPABASE_URL}/functions/v1`;

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

interface VideoSessionProps {
  sessionId: string;
  sessionToken: string;
  onEnd?: () => void;
}

type SessionState = 'idle' | 'loading' | 'in_progress' | 'ended';

export default function VideoSession({
  sessionId,
  sessionToken,
  onEnd,
}: VideoSessionProps) {
  const [state, setState] = useState<SessionState>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);

  async function handleJoinSession() {
    setState('loading');
    try {
      const response = await fetch(`${BASE_URL}/create-video-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const data = await response.json();

      if (!data.success) {
        Alert.alert('Error', data.message || 'Failed to create video session.');
        setState('idle');
        return;
      }

      setRoomId(data.roomId);

      // Build prebuilt meeting URL with token for auth
      const meetingUrl =
        `${data.meetingUrl}?token=${encodeURIComponent(data.token)}` +
        `&webcamEnabled=true&micEnabled=true`;

      const canOpen = await Linking.canOpenURL(meetingUrl);
      if (canOpen) {
        await Linking.openURL(meetingUrl);
        setState('in_progress');
      } else {
        Alert.alert(
          'Error',
          'Unable to open the video session. Please check your browser settings.'
        );
        setState('idle');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
      setState('idle');
    }
  }

  async function handleEndSession() {
    Alert.alert(
      'End Session',
      'Are you sure you want to mark this session as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update session status to completed via Supabase directly
              const { createClient } = await import('@supabase/supabase-js');
              const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: `Bearer ${sessionToken}` } },
              });

              await supabase
                .from('sessions')
                .update({ status: 'completed' })
                .eq('id', sessionId);

              setState('ended');
              onEnd?.();
            } catch {
              Alert.alert('Error', 'Failed to end session. Please try again.');
            }
          },
        },
      ]
    );
  }

  // Idle state — show Join button
  if (state === 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.iconRow}>
          <Text style={styles.videoIcon}>🎥</Text>
        </View>
        <Text style={styles.title}>Video Session</Text>
        <Text style={styles.subtitle}>
          Join the video call in your browser. Both educator and parent can join.
        </Text>
        <Pressable style={styles.joinButton} onPress={handleJoinSession}>
          <Text style={styles.joinButtonText}>Join Session</Text>
        </Pressable>
        <Text style={styles.note}>
          📱 Opens in your browser — works on any device
        </Text>
      </View>
    );
  }

  // Loading state
  if (state === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Setting up video session...</Text>
      </View>
    );
  }

  // In Progress state
  if (state === 'in_progress') {
    return (
      <View style={styles.container}>
        <View style={styles.inProgressBanner}>
          <Text style={styles.inProgressIcon}>🟢</Text>
          <Text style={styles.inProgressText}>Session in progress</Text>
        </View>
        <Text style={styles.subtitle}>
          Your video call is open in the browser. Return here when you're done.
        </Text>

        {/* Rejoin button */}
        <Pressable style={styles.rejoinButton} onPress={handleJoinSession}>
          <Text style={styles.rejoinButtonText}>Rejoin Call</Text>
        </Pressable>

        {/* End session button */}
        <Pressable style={styles.endButton} onPress={handleEndSession}>
          <Text style={styles.endButtonText}>End Session</Text>
        </Pressable>
      </View>
    );
  }

  // Ended state
  return (
    <View style={styles.container}>
      <Text style={styles.completedIcon}>✅</Text>
      <Text style={styles.title}>Session Completed</Text>
      <Text style={styles.subtitle}>
        This session has been marked as completed. Thank you!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconRow: {
    marginBottom: 12,
  },
  videoIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  note: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textLight,
  },
  inProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef7f4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  inProgressIcon: {
    fontSize: 16,
  },
  inProgressText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
  },
  rejoinButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  rejoinButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  endButton: {
    backgroundColor: Colors.warning,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  endButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  completedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
});
