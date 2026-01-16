import "../global.css";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="worker/add" 
          options={{ 
            title: 'Add Worker',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#3B82F6' },
            headerTintColor: '#fff',
          }} 
        />
        <Stack.Screen 
          name="worker/[id]" 
          options={{ 
            title: 'Edit Worker',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#3B82F6' },
            headerTintColor: '#fff',
          }} 
        />
        <Stack.Screen 
          name="worker/details/[id]" 
          options={{ 
            title: 'Worker Details',
            headerStyle: { backgroundColor: '#3B82F6' },
            headerTintColor: '#fff',
          }} 
        />
      </Stack>
    </>
  );
}
