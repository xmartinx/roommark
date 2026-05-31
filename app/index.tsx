import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { session } = useAuth();
  return session
    ? <Redirect href="/(app)" />
    : <Redirect href="/(auth)/welcome" />;
}
