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
  Linking,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

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

interface SubscriptionCheckoutProps {
  sessionToken: string;
}

interface Plan {
  id: string;
  name: string;
  price_inr: number;
  billing_period: string;
  features: string[];
  is_popular?: boolean;
}

function getStatusBg(status: string | null): string {
  if (status === 'active') return '#eef7f4';
  if (status === 'pending') return '#fef3e6';
  return '#fef9f0';
}

function getStatusColor(status: string | null): string {
  if (status === 'active') return '#9caf88';
  if (status === 'pending') return '#e67e22';
  return '#d4a35d';
}

function getStatusText(status: string | null): string {
  if (status === 'active') return '✓ Active';
  if (status === 'pending') return '⏳ Payment Pending';
  return '⏳ Inactive';
}

export default function SubscriptionCheckout({ sessionToken }: SubscriptionCheckoutProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('inactive');
  const [refreshing, setRefreshing] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionToken}` } },
      });

      // Fetch subscription plans (public table)
      const { data: plansData, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_inr', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error.message);
        setPlans(getDefaultPlans());
      } else if (plansData && plansData.length > 0) {
        const mapped: Plan[] = plansData.map((p) => ({
          id: p.id,
          name: p.name || 'Plan',
          price_inr: p.price_inr || 0,
          billing_period: p.billing_period || 'year',
          features: Array.isArray(p.features) ? p.features : [],
          is_popular: p.is_popular || false,
        }));
        setPlans(mapped);
      } else {
        setPlans(getDefaultPlans());
      }

      // Check current subscription status from educator profile
      const { data: profile } = await supabase
        .from('educator_profiles')
        .select('subscription_status')
        .single();

      if (profile) {
        setCurrentStatus(profile.subscription_status || 'inactive');
        setPendingPayment(profile.subscription_status === 'pending');
      }
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setPlans(getDefaultPlans());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // If pending, verify with Razorpay directly
    if (currentStatus === 'pending') {
      try {
        const response = await fetch(`${BASE_URL}/verify-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (data.status === 'active') {
          setCurrentStatus('active');
          setPendingPayment(false);
        }
      } catch {
        // Fall through to normal refresh
      }
    }
    fetchPlans();
  }, [fetchPlans, currentStatus, sessionToken]);

  function getDefaultPlans(): Plan[] {
    return [
      {
        id: 'basic',
        name: 'Basic',
        price_inr: 2999,
        billing_period: 'year',
        features: ['Appear in parent search', 'Accept up to 10 clients', 'Basic profile', 'Session management'],
        is_popular: false,
      },
      {
        id: 'premium',
        name: 'Premium',
        price_inr: 5999,
        billing_period: 'year',
        features: ['Everything in Basic', 'Unlimited clients', 'Priority in search', 'Analytics dashboard', 'Custom scheduling'],
        is_popular: true,
      },
    ];
  }

  async function handleSubscribe(planId: string) {
    setSubscribing(planId);
    try {
      const response = await fetch(`${BASE_URL}/subscribe-educator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      const data = await response.json();

      if (data.already_active) {
        Alert.alert('Already Active', 'You already have an active subscription.');
        setCurrentStatus('active');
        return;
      }

      if (data.success && data.checkout_url) {
        // Open Razorpay checkout URL in the device browser
        const canOpen = await Linking.canOpenURL(data.checkout_url);
        if (canOpen) {
          await Linking.openURL(data.checkout_url);
          setPendingPayment(true);
          setCurrentStatus('pending');
          Alert.alert(
            'Complete Payment',
            'Complete payment in your browser. Your subscription will activate automatically once payment is confirmed.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', 'Unable to open payment page. Please try again.');
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to start subscription. Please try again.');
      }
    } catch (error) {
      console.error('[SubscriptionCheckout] error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubscribing(null);
    }
  }

  function confirmSubscribe(planId: string, planName: string, priceInr: number) {
    Alert.alert(
      'Confirm Subscription',
      `Subscribe to the ${planName} plan for ₹${priceInr.toLocaleString('en-IN')}/year?\n\nYou will be redirected to a secure payment page.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue to Payment', onPress: () => handleSubscribe(planId) },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Choose a Plan</Text>

      {/* Current Status */}
      <View style={styles.statusBanner}>
        <Text style={styles.statusLabel}>Your subscription:</Text>
        <View style={[
          styles.statusBadge,
          {
            backgroundColor: getStatusBg(currentStatus),
          }
        ]}>
          <Text style={[
            styles.statusText,
            {
              color: getStatusColor(currentStatus),
            }
          ]}>
            {getStatusText(currentStatus)}
          </Text>
        </View>
      </View>

      {/* Pending payment message */}
      {pendingPayment && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>
            💳 Payment pending. Pull down to refresh after completing payment in browser.
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {plans.map((plan) => (
          <View
            key={plan.id}
            style={[styles.planCard, plan.is_popular && styles.popularCard]}
          >
            {plan.is_popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>⭐ Most Popular</Text>
              </View>
            )}

            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceSymbol}>₹</Text>
              <Text style={styles.priceAmount}>{plan.price_inr.toLocaleString('en-IN')}</Text>
              <Text style={styles.pricePeriod}>/{plan.billing_period}</Text>
            </View>

            {/* Features */}
            <View style={styles.featuresSection}>
              {plan.features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Subscribe Button */}
            <Pressable
              style={[
                styles.subscribeButton,
                plan.is_popular && styles.subscribeButtonPopular,
                (subscribing === plan.id || currentStatus === 'active') && styles.buttonDisabled,
              ]}
              onPress={() => confirmSubscribe(plan.id, plan.name, plan.price_inr)}
              disabled={subscribing === plan.id || currentStatus === 'active'}
            >
              {subscribing === plan.id ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={[
                  styles.subscribeButtonText,
                  plan.is_popular && styles.subscribeButtonTextPopular,
                ]}>
                  {currentStatus === 'active' ? 'Current Plan' : 'Subscribe'}
                </Text>
              )}
            </Pressable>
          </View>
        ))}

        <Text style={styles.footer}>
          Secure payment powered by Razorpay. Annual billing.
        </Text>
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
    paddingBottom: 8,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 10,
  },
  statusLabel: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#fef3e6',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f5d5a0',
  },
  pendingText: {
    fontSize: 13,
    color: '#8b5c00',
    textAlign: 'center',
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

  // Plan Card
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  popularCard: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 18,
  },
  priceSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  pricePeriod: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 4,
  },

  // Features
  featuresSection: {
    marginBottom: 18,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },

  // Subscribe Button
  subscribeButton: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  subscribeButtonPopular: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subscribeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  subscribeButtonTextPopular: {
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Footer
  footer: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
});
