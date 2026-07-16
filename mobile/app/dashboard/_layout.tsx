import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '../../store/authStore';

const Colors = {
  primary: '#2c5272',
  accent: '#d4a35d',
  textLight: '#6b7280',
  background: '#f9f7f1',
};

export default function DashboardLayout() {
  const role = useAuthStore(state => state.role);
  const isEducator = role === 'special_educator';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e8e5df',
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* Parent tabs */}
      <Tabs.Screen
        name="parent"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
          href: isEducator ? null : '/dashboard/parent',
        }}
      />

      {/* Educator tab — shown as Home for educators */}
      <Tabs.Screen
        name="educator"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
          href: isEducator ? '/dashboard/educator' : null,
        }}
      />

      <Tabs.Screen
        name="classroom"
        options={{
          title: 'Classroom',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📚</Text>,
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔍</Text>,
          // Educators don't need search (they are the ones being searched)
          href: isEducator ? null : '/dashboard/search',
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📅</Text>,
        }}
      />

      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🎮</Text>,
          // Only parents see games tab
          href: isEducator ? null : '/dashboard/games',
        }}
      />
    </Tabs>
  );
}
