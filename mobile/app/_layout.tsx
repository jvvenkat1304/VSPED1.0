import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  useEffect(() => {
    useAuthStore.getState().loadFromSecureStore();
  }, []);

  return <Slot />;
}
