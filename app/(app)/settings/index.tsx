import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Profile summary */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="person-circle-outline" size={40} color="#6B7280" />
          <View style={styles.cardText}>
            <Text style={styles.cardName}>
              {profile?.full_name || 'Inspector'}
            </Text>
            <Text style={styles.cardEmail}>{profile?.email ?? ''}</Text>
          </View>
        </View>
        {profile?.agency_name ? (
          <Text style={styles.cardAgency}>{profile.agency_name}</Text>
        ) : null}
      </View>

      {/* Placeholder */}
      <View style={styles.placeholder}>
        <Ionicons name="settings-outline" size={32} color="#D1D5DB" />
        <Text style={styles.placeholderText}>
          Settings options coming soon
        </Text>
      </View>

      {/* Sign out */}
      <View style={styles.footer}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 32,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  cardAgency: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  placeholderText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  footer: {
    paddingBottom: 40,
  },
});
