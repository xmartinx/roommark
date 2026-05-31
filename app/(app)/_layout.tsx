import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="properties" />
      <Stack.Screen name="inspection" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
