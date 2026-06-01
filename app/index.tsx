import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { session, profile, loading } = useAuth();

  // Show a brief loading screen while checking auth state
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // No session → welcome screen
  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Session exists but profile is incomplete → finish setup
  if (!profile || !profile.full_name) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  // Session + complete profile → dashboard
  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
