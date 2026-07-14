import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ProposalBottomSheet from '../components/ProposalBottomSheet';
import { useAuthStore } from '../store/authStore';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  secondary: '#7fb2b8',
  success: '#9caf88',
  text: '#333333',
  textLight: '#6b7280',
  card: '#ffffff',
  border: '#e8e5df',
};

export default function EducatorProfileScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    subjects: string;
    languages: string;
    rate: string;
    verification_status: string;
    bio: string;
    city: string;
  }>();

  const name = params.name || 'Educator';
  const subjects: string[] = params.subjects ? JSON.parse(params.subjects) : [];
  const languages: string[] = params.languages ? JSON.parse(params.languages) : [];
  const rate = params.rate ? Number(params.rate) : 0;
  const verificationStatus = params.verification_status || '';
  const bio = params.bio || '';
  const city = params.city || '';

  const [showProposal, setShowProposal] = useState(false);

  const sessionToken = useAuthStore(state => state.sessionToken) || '';
  const authChildren = useAuthStore(state => state.children);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>

          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{name.charAt(0)}</Text>
          </View>

          <Text style={styles.educatorName}>{name}</Text>

          {verificationStatus === 'verified' && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓ RCI Verified</Text>
            </View>
          )}
          {verificationStatus === 'provisionally_verified' && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>⏳ Verification Pending</Text>
            </View>
          )}

          {city ? <Text style={styles.cityText}>📍 {city}</Text> : null}
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          {/* Subjects */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subjects</Text>
            <View style={styles.chipContainer}>
              {subjects.map((subject) => (
                <View key={subject} style={styles.chip}>
                  <Text style={styles.chipText}>{subject}</Text>
                </View>
              ))}
              {subjects.length === 0 && (
                <Text style={styles.infoValue}>Not specified</Text>
              )}
            </View>
          </View>

          {/* Languages */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Languages</Text>
            <Text style={styles.infoValue}>
              🗣️ {languages.length > 0 ? languages.join(', ') : 'Not specified'}
            </Text>
          </View>

          {/* Session Rate */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session Rate</Text>
            <Text style={styles.rateValue}>₹{rate}/session</Text>
          </View>
        </View>

        {/* Bio Section */}
        {bio ? (
          <View style={styles.bioCard}>
            <Text style={styles.bioLabel}>About</Text>
            <Text style={styles.bioText}>{bio}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.bottomAction}>
        <Pressable style={styles.actionButton} onPress={() => setShowProposal(true)}>
          <Text style={styles.actionButtonText}>Propose Sessions</Text>
        </Pressable>
        <Text style={styles.actionSubtitle}>
          Choose a session package and the educator will be notified of your proposal
        </Text>
      </View>

      {/* Proposal Bottom Sheet */}
      <ProposalBottomSheet
        educatorId={params.id || ''}
        educatorName={name}
        listedRate={rate}
        isVisible={showProposal}
        onClose={() => setShowProposal(false)}
        onSubmitted={() => setShowProposal(false)}
        sessionToken={sessionToken}
        children={authChildren}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  backArrow: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '600',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarLargeText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#ffffff',
  },
  educatorName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  verifiedBadge: {
    backgroundColor: '#eef7f4',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  verifiedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  pendingBadge: {
    backgroundColor: '#fef9f0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  cityText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 18,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  rateValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.accent,
  },

  // Bio Card
  bioCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 16,
  },
  bioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  bioText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },

  // Bottom Action
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 17,
  },
});
