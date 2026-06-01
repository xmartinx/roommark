import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdditionalItemsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Additional Items</Text>
        <View style={styles.backSpacer} />
      </View>

      <View style={styles.content}>
        <Ionicons name="construct-outline" size={32} color="#D1D5DB" style={styles.icon} />
        <Text style={styles.heading}>Compliance & Additional Items</Text>
        <Text style={styles.subtitle}>
          Smoke alarms, safety switches, pool fences, and other compliance
          items will be configured here in a future update.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backText: { fontSize: 16, color: '#2563EB', fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  backSpacer: { width: 60 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  icon: { marginBottom: 16 },
  heading: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
