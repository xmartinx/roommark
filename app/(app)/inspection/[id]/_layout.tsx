import { Stack } from 'expo-router';

export default function InspectionDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="rooms" />
      <Stack.Screen name="room/[roomId]" />
      <Stack.Screen name="additional" />
      <Stack.Screen name="preview" />
    </Stack>
  );
}
