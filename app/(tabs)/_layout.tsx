import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        headerStyle: { backgroundColor: '#3B82F6' },
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="daily-entry"
        options={{
          title: 'Daily',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Advance',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bonus"
        options={{
          title: 'Bonus',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
