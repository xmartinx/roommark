import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { upsertProfile, fetchProfileWithRetry } from '@/lib/profile';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

const AUSTRALIAN_STATES = [
  { label: 'WA — Western Australia', value: 'WA' },
  { label: 'NSW — New South Wales', value: 'NSW' },
  { label: 'VIC — Victoria', value: 'VIC' },
  { label: 'QLD — Queensland', value: 'QLD' },
  { label: 'SA — South Australia', value: 'SA' },
  { label: 'TAS — Tasmania', value: 'TAS' },
  { label: 'ACT — Australian Capital Territory', value: 'ACT' },
  { label: 'NT — Northern Territory', value: 'NT' },
];

export default function ProfileSetupScreen() {
  const { session, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultState, setDefaultState] = useState('WA');
  const [showStatePicker, setShowStatePicker] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userEmail = session?.user?.email ?? '';
  const userId = session?.user?.id;

  async function handleContinue() {
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!userId) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setLoading(true);

    // Wait for the auth trigger to create the profile row if it hasn't yet.
    // fetchProfileWithRetry handles the race condition (Rule 9).
    await fetchProfileWithRetry(userId);

    // Upsert the profile with the user's input
    const { success, error: upsertError } = await upsertProfile({
      id: userId,
      full_name: fullName.trim(),
      agency_name: agencyName.trim() || null,
      phone: phone.trim() || null,
      email: userEmail,
      default_state: defaultState,
    });

    setLoading(false);

    if (!success) {
      setError(upsertError ?? 'Failed to save profile. Please try again.');
      return;
    }

    // Refresh the cached profile in useAuth so the rest of the app sees it
    await refreshProfile();

    router.replace('/(app)');
  }

  const selectedStateLabel =
    AUSTRALIAN_STATES.find((s) => s.value === defaultState)?.label ??
    'WA — Western Australia';

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
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>
            This appears on your inspection reports
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Sarah Johnson"
            autoComplete="name"
            textContentType="name"
          />

          <Input
            label="Agency name (optional)"
            value={agencyName}
            onChangeText={setAgencyName}
            placeholder="e.g. Albany Property Management"
          />

          <Input
            label="Phone number (optional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 0412 345 678"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />

          {/* Email — read-only display */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{userEmail}</Text>
            </View>
          </View>

          {/* State picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Default state</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStatePicker(true)}
            >
              <Text style={styles.pickerButtonText}>{selectedStateLabel}</Text>
              <Text style={styles.pickerChevron}>▼</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Continue"
            onPress={handleContinue}
            loading={loading}
            style={styles.button}
          />

          <Text style={styles.finePrint}>
            Your default state determines which inspection template is used.
            You can change this later in Settings.
          </Text>
        </View>
      </ScrollView>

      {/* State picker modal */}
      <Modal
        visible={showStatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select your state</Text>
            <FlatList
              data={AUSTRALIAN_STATES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.stateOption,
                    item.value === defaultState
                      ? styles.stateOptionSelected
                      : null,
                  ]}
                  onPress={() => {
                    setDefaultState(item.value);
                    setShowStatePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.stateOptionText,
                      item.value === defaultState
                        ? styles.stateOptionTextSelected
                        : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === defaultState && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  readOnlyField: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerChevron: {
    fontSize: 12,
    color: '#6B7280',
  },
  button: {
    marginTop: 12,
    marginBottom: 16,
  },
  finePrint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  stateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  stateOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  stateOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  stateOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#2563EB',
    fontWeight: '700',
  },
});
