import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';

const Colors = {
  background: '#f9f7f1',
  primary: '#2c5272',
  accent: '#d4a35d',
  textLight: '#6b7280',
};

export default function StarterPage() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>V-SPED</Text>
        <Text style={styles.tagline}>
          Nurturing every child,{'\n'}milestone at a time.
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/auth/phone-entry')}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>

        <Text style={styles.hint}>Sign up or log in with your phone number</Text>
      </View>

      <Text style={styles.footer}>
        By continuing you agree to our Terms & Privacy Policy
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  footer: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
