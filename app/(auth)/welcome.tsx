import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';

const FEATURES = [
  {
    icon: '🚶',
    title: 'Walk through. Talk through. Done.',
    description:
      'Record your observations room by room. AI transcribes and structures them into a legally compliant report.',
  },
  {
    icon: '📝',
    title: 'AI writes the report as you inspect.',
    description:
      'Claude structures your spoken notes into the exact format each state requires. No typing needed.',
  },
  {
    icon: '🏛️',
    title: 'Legally compliant for every Australian state.',
    description:
      'WA Form 1 is built in. NSW, VIC, QLD, and others follow. Your reports meet all RTA requirements.',
  },
];

export default function WelcomeScreen() {
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={styles.scrollView}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>RoomMark</Text>
          <Text style={styles.tagline}>
            Property inspections, room by room.
          </Text>
        </View>

        {/* Value propositions */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.card}>
              <Text style={styles.cardIcon}>{f.icon}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{f.title}</Text>
                <Text style={styles.cardDescription}>{f.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Create Account"
            onPress={() => router.push('/(auth)/sign-up')}
            variant="primary"
            style={styles.button}
          />
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/sign-in')}
            variant="secondary"
            style={styles.button}
          />
          <Text style={styles.disclaimer}>
            3 free reports per month — no credit card needed
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
  },
  features: {
    gap: 16,
    marginBottom: 48,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 14,
    alignItems: 'flex-start',
  },
  cardIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    alignItems: 'center',
  },
  button: {
    width: '100%',
  },
  disclaimer: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
});
