import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';

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

function handleManagePin() {
  Alert.alert('Coming Soon', 'PIN management will be available in the next update.');
}

function handleDeleteAccount() {
  Alert.alert(
    'Delete Account',
    'To delete your account and all associated data, please contact support at support@vsped.in',
    [{ text: 'OK' }]
  );
}

export default function Settings() {
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);

  function confirmLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: handleLogout },
      ]
    );
  }

  async function handleLogout() {
    await useAuthStore.getState().logout();
    router.replace('/');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Settings</Text>

      {/* User Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {userId ? `${userId.substring(0, 8)}...` : 'N/A'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <Pressable style={styles.menuItem} onPress={handleManagePin}>
            <Text style={styles.menuIcon}>🔑</Text>
            <Text style={styles.menuText}>Manage PIN</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.menuItem} onPress={handleDeleteAccount}>
            <Text style={styles.menuIcon}>🗑️</Text>
            <Text style={[styles.menuText, { color: Colors.warning }]}>Delete Account</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <Text style={styles.menuIcon}>📱</Text>
            <Text style={styles.menuText}>App Version</Text>
            <Text style={styles.versionText}>V-SPED v1.0</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <Pressable style={styles.logoutButton} onPress={confirmLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>

      {/* Footer */}
      <Text style={styles.footer}>
        Made with 💛 for special education in India
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 24,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textLight,
    maxWidth: '50%',
  },

  // Menu Card
  menuCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  menuArrow: {
    fontSize: 20,
    color: Colors.textLight,
    fontWeight: '300',
  },
  versionText: {
    fontSize: 14,
    color: Colors.textLight,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },

  // Logout
  logoutButton: {
    backgroundColor: Colors.warning,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },

  // Footer
  footer: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
