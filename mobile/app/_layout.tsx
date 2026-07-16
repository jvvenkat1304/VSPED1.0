import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Slot } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  useEffect(() => {
    useAuthStore.getState().loadFromSecureStore();
  }, []);

  // Proactive token refresh: every 55 minutes + on app foreground
  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        useAuthStore.getState().refreshSession();
      }
    }, 55 * 60 * 1000); // 55 minutes

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useAuthStore.getState().refreshSession();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  return <Slot />;
}
