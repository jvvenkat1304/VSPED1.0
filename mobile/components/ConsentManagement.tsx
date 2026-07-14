import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';
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

interface ConsentManagementProps {
  sessionToken: string;
}

interface ConsentGrant {
  id: string;
  grantee_id: string;
  grantee_name: string;
  scope: string;
  purpose: string;
  granted_at: string;
  expires_at: string | null;
}

export default function ConsentManagement({ sessionToken }: ConsentManagementProps) {
  const [grants, setGrants] = useState<ConsentGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchGrants = useCallback(async () => {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionToken}` } },
      });

      // Query active consent grants with grantee user info
      // Query active consent grants (active = revoked_at IS NULL)
      const { data, error } = await supabase
        .from('consent_grants')
        .select('id, grantee_id, scope, granted_at, expires_at, revoked_at')
        .is('revoked_at', null);

      if (error) {
        console.error('Error fetching consent grants:', error.message);
        setGrants([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!data || data.length === 0) {
        setGrants([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch grantee names from users table
      const granteeIds = data.map((g) => g.grantee_id).filter(Boolean);
      let granteeNames: Record<string, string> = {};

      if (granteeIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', granteeIds);

        if (users) {
          granteeNames = users.reduce((acc: Record<string, string>, u) => {
            acc[u.id] = u.full_name || 'Educator';
            return acc;
          }, {});
        }
      }

      const mapped: ConsentGrant[] = data.map((g) => ({
        id: g.id,
        grantee_id: g.grantee_id,
        grantee_name: granteeNames[g.grantee_id] || 'Educator',
        scope: Array.isArray(g.scope) ? g.scope.join(', ') : (g.scope || 'Child profile & sessions'),
        purpose: 'Therapy sessions',
        granted_at: g.granted_at,
        expires_at: g.expires_at,
      }));

      setGrants(mapped);
    } catch (err) {
      console.error('Error loading consent grants:', err);
      setGrants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchGrants();
  }, [fetchGrants]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGrants();
  }, [fetchGrants]);

  function confirmRevoke(grantId: string) {
    Alert.alert(
      'Revoke Access',
      'Are you sure? The educator will immediately lose access to your child\'s data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => handleRevoke(grantId) },
      ]
    );
  }

  async function handleRevoke(grantId: string) {
    setRevokingId(grantId);
    try {
      const response = await fetch(`${BASE_URL}/revoke-consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ consent_grant_id: grantId }),
      });

      const data = await response.json();
      if (data.success || response.ok) {
        Alert.alert('Access Revoked', 'The educator no longer has access to your child\'s data.');
        fetchGrants();
      } else {
        Alert.alert('Error', data.error || 'Failed to revoke consent. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setRevokingId(null);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading consent data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerIcon}>🔒</Text>
        <Text style={styles.header}>Data Access</Text>
      </View>
      <Text style={styles.subheader}>Manage who can see your child's information</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {grants.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>No one currently has access</Text>
            <Text style={styles.emptySubtitle}>
              Your child's data is fully private. When you grant access to an educator, it will appear here.
            </Text>
          </View>
        ) : (
          grants.map((grant) => (
            <View key={grant.id} style={styles.grantCard}>
              {/* Educator Info */}
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{grant.grantee_name.charAt(0)}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.granteeName}>{grant.grantee_name}</Text>
                  <Text style={styles.scopeText}>📋 {grant.scope}</Text>
                </View>
              </View>

              {/* Details */}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Purpose</Text>
                  <Text style={styles.detailValue}>{grant.purpose}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Granted</Text>
                  <Text style={styles.detailValue}>{formatDate(grant.granted_at)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expires</Text>
                  <Text style={styles.detailValue}>
                    {grant.expires_at ? `Expires: ${formatDate(grant.expires_at)}` : 'Until sessions complete'}
                  </Text>
                </View>
              </View>

              {/* Revoke Button */}
              <Pressable
                style={[styles.revokeButton, revokingId === grant.id && styles.buttonDisabled]}
                onPress={() => confirmRevoke(grant.id)}
                disabled={revokingId === grant.id}
              >
                {revokingId === grant.id ? (
                  <ActivityIndicator size="small" color={Colors.warning} />
                ) : (
                  <Text style={styles.revokeButtonText}>Revoke Access</Text>
                )}
              </Pressable>
            </View>
          ))
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  headerIcon: {
    fontSize: 22,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  subheader: {
    fontSize: 13,
    color: Colors.textLight,
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginTop: 4,
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

  // Grant Card
  grantCard: {
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
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  cardInfo: {
    flex: 1,
  },
  granteeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  scopeText: {
    fontSize: 12,
    color: Colors.textLight,
  },

  // Details
  detailsSection: {
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  // Revoke Button
  revokeButton: {
    borderWidth: 1.5,
    borderColor: Colors.warning,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  revokeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
