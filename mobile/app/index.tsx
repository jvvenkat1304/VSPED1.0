import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';

// StarterPage — the first screen users see.
// Two options: "Continue with Phone" (sign up / sign in) or "Login" (returning user with PIN).
export default function StarterPage() {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>V-SPED</Text>
        <Text style={styles.tagline}>Nurturing every child,{'\n'}milestone at a time.</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/auth/phone-entry')}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/auth/phone-entry')}
        >
          <Text style={styles.secondaryButtonText}>Continue with Phone</Text>
        </Pressable>

        <Pressable
          style={styles.textButton}
          onPress={() => router.push('/auth/phone-entry')}
        >
          <Text style={styles.textButtonText}>Login</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        By continuing you agree to our Terms & Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: Fonts.sizes.hero,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: Fonts.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.semibold,
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.medium,
  },
  textButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  textButtonText: {
    color: Colors.primary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
    textDecorationLine: 'underline',
  },
  footer: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
