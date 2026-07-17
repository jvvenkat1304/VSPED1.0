import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fedpulmkxjqoaxlanqhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHB1bG1reGpxb2F4bGFucWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ4NzQsImV4cCI6MjA5MjMzMDg3NH0.ZmRQQrW14sWgnGOK1YhxeRNXvdkurmQh-WKUHs3YIow';

interface Child {
  id: string;
  name: string;
}

interface AuthState {
  userId: string | null;
  sessionToken: string | null;
  refreshToken: string | null;
  role: string | null;
  children: Child[];
  isLoading: boolean;
  isRefreshing: boolean;

  // Actions
  setAuth: (userId: string, sessionToken: string, refreshToken: string, role?: string) => Promise<void>;
  loadFromSecureStore: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  fetchChildren: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  sessionToken: null,
  refreshToken: null,
  role: null,
  children: [],
  isLoading: true,
  isRefreshing: false,

  setAuth: async (userId, sessionToken, refreshToken, role) => {
    await SecureStore.setItemAsync('user_id', userId);
    await SecureStore.setItemAsync('session_token', sessionToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    if (role) await SecureStore.setItemAsync('role', role);
    set({ userId, sessionToken, refreshToken, role: role || get().role });
    // After auth is set, fetch children
    get().fetchChildren();
  },

  loadFromSecureStore: async () => {
    try {
      const userId = await SecureStore.getItemAsync('user_id');
      const sessionToken = await SecureStore.getItemAsync('session_token');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      const role = await SecureStore.getItemAsync('role');
      set({ userId, sessionToken, refreshToken, role, isLoading: false });

      // If we have a refresh token, attempt refresh on launch for a fresh access token
      if (refreshToken) {
        await get().refreshSession();
      }
      // If we have a session, fetch children
      if (get().sessionToken) {
        get().fetchChildren();
      }
    } catch {
      set({ isLoading: false });
    }
  },

  refreshSession: async () => {
    const { refreshToken, isRefreshing } = get();
    if (!refreshToken || isRefreshing) return false;

    set({ isRefreshing: true });
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

      if (error || !data.session) {
        // Only logout if the token is truly invalid/expired (not a network hiccup)
        const isTokenInvalid = error?.message?.toLowerCase().includes('invalid') ||
          error?.message?.toLowerCase().includes('expired') ||
          error?.message?.toLowerCase().includes('not found') ||
          error?.status === 401 || error?.status === 403;

        if (isTokenInvalid) {
          await get().logout();
        }
        set({ isRefreshing: false });
        return false;
      }

      const newAccess = data.session.access_token;
      const newRefresh = data.session.refresh_token;

      await SecureStore.setItemAsync('session_token', newAccess);
      await SecureStore.setItemAsync('refresh_token', newRefresh);
      set({ sessionToken: newAccess, refreshToken: newRefresh, isRefreshing: false });
      return true;
    } catch {
      set({ isRefreshing: false });
      return false;
    }
  },

  fetchChildren: async () => {
    const { sessionToken } = get();
    if (!sessionToken) return;

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionToken}` } },
      });

      // First get child IDs from the children table (RLS filters to parent's children)
      const { data, error } = await supabase
        .from('children')
        .select('id');

      if (error || !data || data.length === 0) {
        set({ children: [] });
        return;
      }

      // Then fetch decrypted details for each child via the get-child edge function
      const childList: Child[] = [];
      for (const child of data) {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/get-child`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ child_id: child.id }),
          });
          const childData = await response.json();
          if (childData.child || childData.name) {
            childList.push({
              id: child.id,
              name: childData.child?.name || childData.name || 'My Child',
            });
          } else {
            childList.push({ id: child.id, name: 'My Child' });
          }
        } catch {
          childList.push({ id: child.id, name: 'My Child' });
        }
      }
      set({ children: childList });
    } catch {
      // Silently fail — children will be empty
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('user_id');
    await SecureStore.deleteItemAsync('session_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('has_pin');
    await SecureStore.deleteItemAsync('role');
    set({ userId: null, sessionToken: null, refreshToken: null, role: null, children: [], isLoading: false, isRefreshing: false });
  },
}));
