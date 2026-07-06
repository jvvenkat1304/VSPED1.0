import { View, Text, StyleSheet } from 'react-native';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  secondary: '#7fb2b8',
  textLight: '#6b7280',
};

export default function GamesScreen() {
  // This is the modular games space.
  // Venkat's game modules will be integrated here as separate components.
  // Games are loaded as independent modules that don't affect the core app.

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎮</Text>
      <Text style={styles.title}>Games & Activities</Text>
      <Text style={styles.subtitle}>
        Interactive educational games and skill assessments are coming soon.
      </Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>🧩 NeuroBridge Module</Text>
      </View>
      <Text style={styles.note}>
        Games will help track your child's progress in a fun and engaging way.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  badge: {
    backgroundColor: '#eef8fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.secondary,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  note: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
});
