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

export default function ParentDashboard() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Parent 👋</Text>
        <Text style={styles.subtitle}>What would you like to do today?</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.grid}>
        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>🔍</Text>
          <Text style={styles.actionTitle}>Find Educators</Text>
          <Text style={styles.actionDesc}>Browse RCI-verified special educators</Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>👶</Text>
          <Text style={styles.actionTitle}>My Children</Text>
          <Text style={styles.actionDesc}>Manage child profiles</Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>📅</Text>
          <Text style={styles.actionTitle}>Sessions</Text>
          <Text style={styles.actionDesc}>View upcoming sessions</Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>🔒</Text>
          <Text style={styles.actionTitle}>Privacy</Text>
          <Text style={styles.actionDesc}>Manage data access & consent</Text>
        </Pressable>
      </View>

      {/* Status Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>🛡️ Your child's data is encrypted and only visible to you.</Text>
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
  banner: {
    backgroundColor: '#eef7f4',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  bannerText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
});
