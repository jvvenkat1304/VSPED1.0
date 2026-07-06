import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  secondary: '#7fb2b8',
  text: '#333333',
  textLight: '#6b7280',
};

export default function RoleSelectPage() {
  const { user_id, session_token } = useLocalSearchParams<{ user_id: string; session_token: string }>();

  const handleSelectRole = (role: 'parent' | 'special_educator') => {
    if (role === 'parent') {
      router.replace({
        pathname: '/onboarding/parent-setup',
        params: { user_id, session_token },
      });
    } else {
      router.replace('/dashboard/educator');
      // TODO: educator onboarding (profile + RCI)
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to V-SPED</Text>
        <Text style={styles.subtitle}>How will you be using this app?</Text>
      </View>

      <View style={styles.cards}>
        {/* Parent Card */}
        <Pressable style={styles.card} onPress={() => handleSelectRole('parent')}>
          <Text style={styles.cardEmoji}>👨‍👩‍👧</Text>
          <Text style={styles.cardTitle}>I'm a Parent</Text>
          <Text style={styles.cardDescription}>
            Find special educators for my child, track progress, and manage sessions.
          </Text>
        </Pressable>

        {/* Educator Card */}
        <Pressable style={[styles.card, styles.cardSecondary]} onPress={() => handleSelectRole('special_educator')}>
          <Text style={styles.cardEmoji}>🎓</Text>
          <Text style={styles.cardTitle}>I'm a Special Educator</Text>
          <Text style={styles.cardDescription}>
            Offer my services, manage clients, conduct sessions, and grow my practice.
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
  },
  cards: {
    gap: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSecondary: {
    borderColor: Colors.secondary,
  },
  cardEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
});
