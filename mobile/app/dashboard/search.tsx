import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';

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

// Placeholder data — will be replaced with live backend search
const MOCK_EDUCATORS = [
  { id: '1', name: 'Dr. Priya Sharma', subjects: ['Speech Therapy', 'Social Skills'], languages: ['English', 'Hindi'], rating: 4.8, rate: 800, verified: true },
  { id: '2', name: 'Anita Reddy', subjects: ['Occupational Therapy'], languages: ['English', 'Telugu'], rating: 4.6, rate: 600, verified: true },
  { id: '3', name: 'Rajesh Kumar', subjects: ['Special Education', 'Maths'], languages: ['Hindi', 'English'], rating: 4.9, rate: 1000, verified: true },
];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

  const filtered = MOCK_EDUCATORS.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || e.subjects.includes(selectedSubject);
    return matchesSearch && matchesSubject;
  });

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

      {/* Results */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.results}
        renderItem={({ item }) => (
          <Pressable style={styles.educatorCard}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.educatorName}>{item.name}</Text>
                  {item.verified && <Text style={styles.verifiedBadge}>✓ RCI</Text>}
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
});
