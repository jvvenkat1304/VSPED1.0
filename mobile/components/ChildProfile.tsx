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
import { useAuthStore } from '../store/authStore';
import AddChildForm from './AddChildForm';

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

interface ChildProfileProps {
  sessionToken: string;
}

interface ChildDetail {
  id: string;
  name: string;
  dob: string | null;
  gender: string | null;
  age: number | null;
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function handleEdit() {
  Alert.alert('Coming Soon', 'Edit functionality will be available in the next update.');
}

export default function ChildProfile({ sessionToken }: ChildProfileProps) {
  const children = useAuthStore((state) => state.children);
  const fetchChildren = useAuthStore((state) => state.fetchChildren);
  const [childDetails, setChildDetails] = useState<ChildDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!children || children.length === 0) {
      setChildDetails([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const details: ChildDetail[] = [];

      for (const child of children) {
        try {
          const response = await fetch(`${BASE_URL}/get-child`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ child_id: child.id }),
          });

          const data = await response.json();
          if (data.child || data.success) {
            const childData = data.child || data;
            details.push({
              id: child.id,
              name: childData.name || child.name,
              dob: childData.dob || childData.date_of_birth || null,
              gender: childData.gender || null,
              age: calculateAge(childData.dob || childData.date_of_birth || null),
            });
          } else {
            // Fallback to basic info from store
            details.push({
              id: child.id,
              name: child.name,
              dob: null,
              gender: null,
              age: null,
            });
          }
        } catch {
          details.push({
            id: child.id,
            name: child.name,
            dob: null,
            gender: null,
            age: null,
          });
        }
      }

      setChildDetails(details);
    } catch (err) {
      console.error('Error fetching child details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [children, sessionToken]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
    fetchDetails();
  }, [fetchChildren, fetchDetails]);

  // --- Render ---

  const [showAddForm, setShowAddForm] = useState(false);

  // Show the Add Child form
  if (showAddForm) {
    return (
      <AddChildForm
        onSuccess={() => {
          setShowAddForm(false);
          fetchDetails();
        }}
        onCancel={() => setShowAddForm(false)}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading children...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Children</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {childDetails.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👶</Text>
            <Text style={styles.emptyTitle}>No children added yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your child's profile to get started with finding educators.
            </Text>
          </View>
        ) : (
          childDetails.map((child) => (
            <View key={child.id} style={styles.childCard}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{child.name.charAt(0)}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.childName}>{child.name}</Text>
                  {child.age !== null && (
                    <Text style={styles.ageText}>{child.age} years old</Text>
                  )}
                </View>
                <Pressable style={styles.editButton} onPress={handleEdit}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
              </View>

              {/* Details */}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date of Birth</Text>
                  <Text style={styles.detailValue}>
                    {child.dob
                      ? new Date(child.dob).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Not set'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>
                    {child.gender
                      ? child.gender.charAt(0).toUpperCase() + child.gender.slice(1)
                      : 'Not set'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Add Child Button */}
        <Pressable style={styles.addChildButton} onPress={() => setShowAddForm(true)}>
          <Text style={styles.addChildIcon}>+</Text>
          <Text style={styles.addChildText}>Add Child</Text>
        </Pressable>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Text style={styles.privacyText}>
            🔒 Your child's data is encrypted. Only you can see this information.
          </Text>
        </View>
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

  // Child Card
  childCard: {
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  cardInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  ageText: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Details
  detailsSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
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
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },

  // Add Child
  addChildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    gap: 8,
  },
  addChildIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.accent,
  },
  addChildText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Privacy Notice
  privacyNotice: {
    backgroundColor: '#eef7f4',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  privacyText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
});
