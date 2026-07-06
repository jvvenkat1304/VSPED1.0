import { View, Text, StyleSheet } from 'react-native';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  textLight: '#6b7280',
};

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📅</Text>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.subtitle}>
        Your upcoming sessions and reminders will appear here once you're enrolled with an educator.
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
  },
});
