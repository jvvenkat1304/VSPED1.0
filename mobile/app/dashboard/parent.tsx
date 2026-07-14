import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import ParentProposalsView from '../../components/ParentProposalsView';
import NotificationFeed from '../../components/NotificationFeed';
import ConsentManagement from '../../components/ConsentManagement';
import ChildProfile from '../../components/ChildProfile';
import Settings from '../../components/Settings';
import { useAuthStore } from '../../store/authStore';

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

type ActiveView = 'dashboard' | 'proposals' | 'notifications' | 'consent' | 'children' | 'settings';

export default function ParentDashboard() {
  const sessionToken = useAuthStore(state => state.sessionToken) || '';
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  // Render inline views based on active state
  if (activeView !== 'dashboard') {
    return (
      <View style={styles.container}>
        <View style={styles.proposalsHeader}>
          <Pressable style={styles.backBtn} onPress={() => setActiveView('dashboard')}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
        </View>
        {activeView === 'notifications' && <NotificationFeed sessionToken={sessionToken} />}
        {activeView === 'proposals' && <ParentProposalsView sessionToken={sessionToken} />}
        {activeView === 'consent' && <ConsentManagement sessionToken={sessionToken} />}
        {activeView === 'children' && <ChildProfile sessionToken={sessionToken} />}
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
            <Text style={styles.greeting}>Hello, Parent 👋</Text>
            <Text style={styles.subtitle}>What would you like to do today?</Text>
          </View>
          {/* Header Icons */}
          <View style={styles.headerIcons}>
            <Pressable
              style={styles.iconButton}
              onPress={() => setActiveView('settings')}
            >
              <Text style={styles.iconEmoji}>⚙️</Text>
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={() => setActiveView('notifications')}
            >
              <Text style={styles.iconEmoji}>🔔</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.grid}>
        <Pressable style={styles.actionCard} onPress={() => router.push('/dashboard/search')}>
          <Text style={styles.actionEmoji}>🔍</Text>
          <Text style={styles.actionTitle}>Find Educators</Text>
          <Text style={styles.actionDesc}>Browse RCI-verified special educators</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => setActiveView('children')}>
          <Text style={styles.actionEmoji}>👶</Text>
          <Text style={styles.actionTitle}>My Children</Text>
          <Text style={styles.actionDesc}>Manage child profiles</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => setActiveView('proposals')}>
          <Text style={styles.actionEmoji}>📅</Text>
          <Text style={styles.actionTitle}>Sessions</Text>
          <Text style={styles.actionDesc}>View proposals & sessions</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => setActiveView('consent')}>
          <Text style={styles.actionEmoji}>🔒</Text>
          <Text style={styles.actionTitle}>Privacy</Text>
          <Text style={styles.actionDesc}>Manage data access & consent</Text>
        </Pressable>

        {/* My Proposals Card */}
        <Pressable style={[styles.actionCard, styles.proposalsCard]} onPress={() => setActiveView('proposals')}>
          <Text style={styles.actionEmoji}>📋</Text>
          <Text style={styles.actionTitle}>My Proposals</Text>
          <Text style={styles.actionDesc}>Track session proposals & payments</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
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
