import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import type { PropertyInsert } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUSTRALIAN_STATES = [
  { label: 'WA', value: 'WA' },
  { label: 'NSW', value: 'NSW' },
  { label: 'VIC', value: 'VIC' },
  { label: 'QLD', value: 'QLD' },
  { label: 'SA', value: 'SA' },
  { label: 'TAS', value: 'TAS' },
  { label: 'ACT', value: 'ACT' },
  { label: 'NT', value: 'NT' },
];

const PROPERTY_TYPES = ['House', 'Unit', 'Townhouse', 'Other'] as const;

const BEDROOMS = ['1', '2', '3', '4', '5', '6+'] as const;
const BATHROOMS = ['1', '1.5', '2', '2.5', '3', '3+'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewPropertyScreen() {
  const { profile } = useAuth();

  // Required fields
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState(profile?.default_state ?? 'WA');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [postcode, setPostcode] = useState('');
  const [propertyType, setPropertyType] = useState<string>('House');
  const [bedrooms, setBedrooms] = useState<string>('3');
  const [bathrooms, setBathrooms] = useState<string>('1');

  // Error / loading
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  async function handleSubmit() {
    setError(null);

    // Validate required
    if (!address.trim()) { setError('Please enter the street address.'); return; }
    if (!suburb.trim())  { setError('Please enter the suburb.'); return; }
    if (!postcode.trim() || postcode.trim().length < 4) {
      setError('Please enter a valid postcode.'); return;
    }

    const beds = bedrooms === '6+' ? 6 : parseInt(bedrooms, 10);
    const baths = bathrooms === '3+' ? 3
      : bathrooms === '2.5' ? 2.5
      : bathrooms === '1.5' ? 1.5
      : parseInt(bathrooms, 10);

    const insert: PropertyInsert = {
      user_id: profile!.id,
      address: address.trim(),
      suburb: suburb.trim(),
      state,
      postcode: postcode.trim(),
      property_type: propertyType.toLowerCase(),
      bedrooms: beds,
      bathrooms: baths,
      landlord_name: null,
      landlord_email: null,
      landlord_phone: null,
      tenant_name: null,
      tenant_email: null,
      tenant_phone: null,
    };

    setLoading(true);
    const { error: insertError } = await supabase
      .from('properties')
      .insert(insert);

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.back();
  }

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  function renderChipGroup<T extends string>(
    options: readonly T[],
    selected: string,
    onSelect: (v: string) => void,
  ) {
    return (
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = opt === selected;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  active ? styles.chipTextActive : null,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Property</Text>
          <View style={styles.backSpacer} />
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Required fields */}
        <Text style={styles.sectionHeader}>Required</Text>

        <Input
          label="Street address"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. 42 Strickland Street"
          textContentType="fullStreetAddress"
        />

        <Input
          label="Suburb"
          value={suburb}
          onChangeText={setSuburb}
          placeholder="e.g. Albany"
        />

        {/* State picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>State</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowStatePicker(true)}
          >
            <Text style={styles.pickerText}>{state}</Text>
            <Text style={styles.pickerChevron}>▼</Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Postcode"
          value={postcode}
          onChangeText={setPostcode}
          placeholder="e.g. 6330"
          keyboardType="number-pad"
          maxLength={4}
        />

        {/* Property type */}
        <Text style={styles.fieldLabel}>Property type</Text>
        {renderChipGroup(PROPERTY_TYPES, propertyType, setPropertyType)}
        <View style={styles.spacer} />

        {/* Bedrooms */}
        <Text style={styles.fieldLabel}>Bedrooms</Text>
        {renderChipGroup(BEDROOMS, bedrooms, setBedrooms)}
        <View style={styles.spacer} />

        {/* Bathrooms */}
        <Text style={styles.fieldLabel}>Bathrooms</Text>
        {renderChipGroup(BATHROOMS, bathrooms, setBathrooms)}

        {/* Submit */}
        <Button
          title="Add Property"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
        />
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
            <Text style={styles.modalTitle}>Select state</Text>
            <FlatList
              data={AUSTRALIAN_STATES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.stateOption,
                    item.value === state ? styles.stateOptionSelected : null,
                  ]}
                  onPress={() => {
                    setState(item.value);
                    setShowStatePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.stateOptionText,
                      item.value === state
                        ? styles.stateOptionTextSelected
                        : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === state && (
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  backSpacer: {
    width: 40,
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  // Field picker
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
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
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerChevron: {
    fontSize: 12,
    color: '#6B7280',
  },
  spacer: {
    height: 8,
  },
  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  chipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  chipText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 24,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
