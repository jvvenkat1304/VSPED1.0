import { Tabs } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
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

  // Guard: don't render tabs until role is hydrated — prevents wrong tabs flashing
  if (!role) {
    return (
      <View style={layoutStyles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName={isEducator ? 'educator' : 'parent'}
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
      {/* Parent Home — hidden for educators */}
      <Tabs.Screen
        name="parent"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
          href: isEducator ? null : '/dashboard/parent',
        }}
        redirect={isEducator}
      />

      {/* Educator Home — hidden for parents */}
      <Tabs.Screen
        name="educator"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
          href: isEducator ? '/dashboard/educator' : null,
        }}
        redirect={!isEducator}
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
          href: isEducator ? null : '/dashboard/search',
        }}
        redirect={isEducator}
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
          href: isEducator ? null : '/dashboard/games',
        }}
        redirect={isEducator}
      />
    </Tabs>
  );
}

const layoutStyles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
