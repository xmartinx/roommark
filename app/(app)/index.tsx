import { View, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';

export default function DashboardScreen() {
  const { profile, signOut } = useAuth();

  const displayName = profile?.full_name || 'Inspector';
  const agency = profile?.agency_name;

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {displayName}</Text>
        {agency ? <Text style={styles.agency}>{agency}</Text> : null}
      </View>

      <View style={styles.content}>
        <Text style={styles.placeholder}>Your inspections will appear here</Text>
      </View>

      <View style={styles.footer}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
          style={styles.signOutButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  agency: {
    fontSize: 15,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  footer: {
    alignItems: 'center',
  },
  signOutButton: {
    width: '100%',
  },
});
