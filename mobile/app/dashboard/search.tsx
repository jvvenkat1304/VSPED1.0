import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
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
  text: '#333333',
  textLight: '#6b7280',
  inputBackground: '#ffffff',
  border: '#e8e5df',
  placeholder: '#9ca3af',
  card: '#ffffff',
};

const SUBJECTS = [
  'All', 'Speech Therapy', 'Occupational Therapy', 'Behavioural Therapy',
  'Special Education', 'Maths', 'Science', 'English', 'Social Skills',
];

interface Educator {
  id: string;
  name: string;
  subjects: string[];
  languages: string[];
  rating: string;
  rate: number;
  verification_status: 'provisionally_verified' | 'verified';
  bio: string;
  city: string;
}

export default function SearchScreen() {
  const sessionToken = useAuthStore(state => state.sessionToken);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [educators, setEducators] = useState<Educator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEducators();
  }, [sessionToken]);

  async function fetchEducators() {
    setLoading(true);
    try {
      // Create authenticated client to avoid RLS recursion on users table
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {} }
      });
      // Query educator_profiles — RLS automatically filters to
      // verification_status IN ('provisionally_verified', 'verified') AND subscription_status = 'active'
      const { data: profiles, error } = await supabase
        .from('educator_profiles')
        .select('id, rci_number, subjects, languages, city, session_rate_inr, verification_status, bio');

      if (error) {
        console.error('Error fetching educators:', error.message);
        setEducators([]);
        setLoading(false);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setEducators([]);
        setLoading(false);
        return;
      }

      // Fetch user names for the educators (educator_profiles.id = users.id)
      // Using try/catch because users table RLS can cause issues with some auth states
      const userIds = profiles.map((p) => p.id).filter(Boolean);
      let userNames: Record<string, string> = {};

      if (userIds.length > 0) {
        try {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

          if (!usersError && users) {
            userNames = users.reduce((acc: Record<string, string>, u) => {
              acc[u.id] = u.full_name || 'Educator';
              return acc;
            }, {});
          }
        } catch {
          // Silently fail — we'll show 'Educator' as fallback
        }
      }

      // Map to the format needed by FlatList
      const mapped: Educator[] = profiles.map((p) => ({
        id: p.id,
        name: userNames[p.id] || 'Educator',
        subjects: p.subjects || [],
        languages: p.languages || [],
        rating: 'New',
        rate: p.session_rate_inr || 0,
        verification_status: p.verification_status,
        bio: p.bio || '',
        city: p.city || '',
      }));

      setEducators(mapped);
    } catch (err) {
      console.error('Unexpected error fetching educators:', err);
      setEducators([]);
    } finally {
      setLoading(false);
    }
  }

  // Client-side filtering on the fetched data
  const filtered = educators.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || e.subjects.includes(selectedSubject);
    return matchesSearch && matchesSubject;
  });

  function renderVerificationBadge(status: Educator['verification_status']) {
    if (status === 'verified') {
      return <Text style={styles.verifiedBadge}>✓ RCI Verified</Text>;
    }
    if (status === 'provisionally_verified') {
      return <Text style={styles.pendingBadge}>⏳ Pending</Text>;
    }
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find an Educator</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or subject..."
          placeholderTextColor={Colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Subject Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
        {SUBJECTS.map((subject) => (
          <Pressable
            key={subject}
            style={[styles.filterChip, selectedSubject === subject && styles.filterChipActive]}
            onPress={() => setSelectedSubject(subject)}
          >
            <Text style={[styles.filterText, selectedSubject === subject && styles.filterTextActive]}>
              {subject}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading educators...</Text>
        </View>
      ) : (
        /* Results */
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.results}
          renderItem={({ item }) => (
            <Pressable
              style={styles.educatorCard}
              onPress={() => router.push({
                pathname: '/educator-profile',
                params: {
                  id: item.id,
                  name: item.name,
                  subjects: JSON.stringify(item.subjects),
                  languages: JSON.stringify(item.languages),
                  rate: String(item.rate),
                  verification_status: item.verification_status,
                  bio: item.bio,
                  city: item.city,
                },
              })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.educatorName}>{item.name}</Text>
                    {renderVerificationBadge(item.verification_status)}
                  </View>
                  <Text style={styles.subjects}>{item.subjects.join(' • ')}</Text>
                  <Text style={styles.languages}>🗣️ {item.languages.join(', ')}</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.rating}>⭐ {item.rating}</Text>
                <Text style={styles.rate}>₹{item.rate}/session</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No educators found matching your filters.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    marginHorizontal: 24,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  filters: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterText: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  results: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    gap: 14,
  },
  educatorCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  educatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  verifiedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
    backgroundColor: '#eef7f4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pendingBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
    backgroundColor: '#fef9f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  subjects: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  languages: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  rate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },
});
