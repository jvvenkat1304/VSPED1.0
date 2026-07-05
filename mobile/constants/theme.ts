// V-SPED Brand Theme
// Based on Vathsalya brand palette from Canva

export const Colors = {
  // Core palette
  background: '#f9f7f1',      // Soft Parchment — app background
  primary: '#2c5272',          // Deep Trust Blue — headers, primary buttons, key text
  text: '#333333',             // Dark Charcoal — body text
  accent: '#d4a35d',           // Optimism Gold — CTAs, highlights, important actions
  secondary: '#7fb2b8',        // Nurturing Teal — secondary actions, info cards
  success: '#9caf88',          // Sage Green — success states, verification badges
  warning: '#c68e8e',          // Muted Rose — warnings, errors, alerts

  // Derived
  white: '#ffffff',
  card: '#ffffff',
  border: '#e8e5df',           // Subtle border (derived from parchment)
  textLight: '#6b7280',        // Muted text for subtitles
  inputBackground: '#ffffff',
  placeholder: '#9ca3af',
  overlay: 'rgba(44, 82, 114, 0.5)',  // Semi-transparent primary for modals
} as const;

export const Fonts = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
