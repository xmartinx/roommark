import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Property Detail' }} />
      <Text style={styles.title}>Property Detail</Text>
      <Text style={styles.subtitle}>Property ID: {id}</Text>
      <ActivityIndicator size="small" color="#2563EB" style={styles.spinner} />
      <Text style={styles.comingSoon}>Full detail view coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: 16,
  },
  spinner: {
    marginBottom: 8,
  },
  comingSoon: {
    fontSize: 14,
    color: '#6B7280',
  },
});
