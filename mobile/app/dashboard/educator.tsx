import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

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

export default function EducatorDashboard() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Educator 🎓</Text>
        <Text style={styles.subtitle}>Manage your practice</Text>
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

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>📅</Text>
          <Text style={styles.actionTitle}>Sessions</Text>
          <Text style={styles.actionDesc}>Propose & manage sessions</Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
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
      </View>

      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Profile Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusItem}>RCI Verified: ⏳ Pending</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusItem}>Subscription: ⏳ Not active</Text>
        </View>
        <Text style={styles.statusNote}>
          Complete verification and subscribe to appear in parent search.
        </Text>
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
});
