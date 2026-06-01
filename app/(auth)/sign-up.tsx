import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);

    // Client-side validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    setLoading(false);

    if (signUpError) {
      // Map common Supabase error codes to user-friendly messages
      if (signUpError.message.includes('already registered')) {
        setError('An account with this email already exists.');
      } else if (
        signUpError.message.includes('password') ||
        signUpError.message.includes('weak')
      ) {
        setError('Please choose a stronger password (6+ characters).');
      } else {
        setError(signUpError.message);
      }
      return;
    }

    // Navigate to profile setup — useAuth will fetch the profile after
    // the SIGNED_IN event fires, handling the auth trigger race condition.
    router.replace('/(auth)/profile-setup');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Start with 3 free reports per month
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Text style={styles.footerLink}>
              Already have an account?{' '}
              <Text style={styles.footerLinkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 28,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  button: {
    marginTop: 8,
    marginBottom: 20,
  },
  footerLink: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerLinkBold: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
