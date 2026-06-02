import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Reverse auth guard: redirect signed-in users to the app
  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace('/(app)');
    }
  }, [session, loading, router]);

  // Show nothing while loading to prevent flash
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}
