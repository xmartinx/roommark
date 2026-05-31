import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RoomMark</Text>
      <Text style={styles.subtitle}>
        AI-powered rental property inspections
      </Text>
      <Link href="/(auth)/sign-in" style={styles.link}>
        Sign In
      </Link>
      <Link href="/(auth)/sign-up" style={styles.link}>
        Create Account
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
    textAlign: 'center',
  },
  link: {
    fontSize: 16,
    color: '#2563EB',
    marginVertical: 8,
    padding: 12,
  },
});
