import { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import type { Property } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants (same as new.tsx)
// ---------------------------------------------------------------------------

const AUSTRALIAN_STATES = [
  { label: 'WA', value: 'WA' }, { label: 'NSW', value: 'NSW' },
  { label: 'VIC', value: 'VIC' }, { label: 'QLD', value: 'QLD' },
  { label: 'SA', value: 'SA' },   { label: 'TAS', value: 'TAS' },
  { label: 'ACT', value: 'ACT' }, { label: 'NT', value: 'NT' },
];

const PROPERTY_TYPES = ['House', 'Unit', 'Townhouse', 'Other'] as const;
const BEDROOMS = ['1', '2', '3', '4', '5', '6+'] as const;
const BATHROOMS = ['1', '1.5', '2', '2.5', '3', '3+'] as const;

function bedsToLabel(n: number | null): string {
  if (n == null) return '3';
  if (n >= 6) return '6+';
  return String(n);
}

function bathsToLabel(n: number | null): string {
  if (n == null) return '1';
  if (n >= 3) return '3+';
  if (n === 1.5) return '1.5';
  if (n === 2.5) return '2.5';
  return String(n);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fields
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState(profile?.default_state ?? 'WA');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [postcode, setPostcode] = useState('');
  const [propertyType, setPropertyType] = useState<string>('House');
  const [bedrooms, setBedrooms] = useState<string>('3');
  const [bathrooms, setBathrooms] = useState<string>('1');
  // Optional
  const [landlordName, setLandlordName] = useState('');
  const [landlordEmail, setLandlordEmail] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');

  // ------------------------------------------------------------------
  // Load property data
  // ------------------------------------------------------------------
  const loadProperty = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    const { data, error: fetchErr } = await supabase
      .from('properties').select('*').eq('id', id).single();
    if (fetchErr || !data) {
      setLoadError('Property not found.');
      setLoading(false);
      return;
    }
    const p = data as Property;
    setAddress(p.address);
    setSuburb(p.suburb);
    setState(p.state);
    setPostcode(p.postcode);
    setPropertyType((p.property_type ?? 'house').charAt(0).toUpperCase() + (p.property_type ?? 'house').slice(1));
    setBedrooms(bedsToLabel(p.bedrooms));
    setBathrooms(bathsToLabel(p.bathrooms));
    setLandlordName(p.landlord_name ?? '');
    setLandlordEmail(p.landlord_email ?? '');
    setLandlordPhone(p.landlord_phone ?? '');
    setTenantName(p.tenant_name ?? '');
    setTenantEmail(p.tenant_email ?? '');
    setTenantPhone(p.tenant_phone ?? '');
    setLoading(false);
  }, [id]);

  useEffect(() => { loadProperty(); }, [loadProperty]);

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  async function handleSave() {
    setError(null);
    if (!address.trim()) { setError('Street address is required.'); return; }
    if (!suburb.trim())  { setError('Suburb is required.'); return; }
    if (!postcode.trim() || postcode.trim().length < 4) { setError('Valid postcode is required.'); return; }

    setSaving(true);

    const beds = bedrooms === '6+' ? 6 : parseInt(bedrooms, 10);
    const baths = bathrooms === '3+' ? 3
      : bathrooms === '2.5' ? 2.5
      : bathrooms === '1.5' ? 1.5
      : parseInt(bathrooms, 10);

    const { error: updateErr } = await supabase
      .from('properties')
      .update({
        address: address.trim(),
        suburb: suburb.trim(),
        state,
        postcode: postcode.trim(),
        property_type: propertyType.toLowerCase(),
        bedrooms: beds,
        bathrooms: baths,
        landlord_name: landlordName.trim() || null,
        landlord_email: landlordEmail.trim() || null,
        landlord_phone: landlordPhone.trim() || null,
        tenant_name: tenantName.trim() || null,
        tenant_email: tenantEmail.trim() || null,
        tenant_phone: tenantPhone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setSaving(false);

    if (updateErr) { setError(updateErr.message); return; }

    router.back();
  }

  // ------------------------------------------------------------------
  // Chip group renderer
  // ------------------------------------------------------------------
  function renderChipGroup<T extends string>(options: readonly T[], selected: string, onSelect: (v: string) => void) {
    return (
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = opt === selected;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Loading / error
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadError}>{loadError}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.goBackBtn}>
          <Text style={styles.goBackText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Property</Text>
          <View style={styles.backSpacer} />
        </View>

        {error ? (
          <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>
        ) : null}

        {/* Required */}
        <Text style={styles.sectionHeader}>Required</Text>

        <Input label="Street address" value={address} onChangeText={setAddress} placeholder="e.g. 42 Strickland Street" textContentType="fullStreetAddress" />
        <Input label="Suburb" value={suburb} onChangeText={setSuburb} placeholder="e.g. Albany" />

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>State</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStatePicker(true)}>
            <Text style={styles.pickerText}>{state}</Text>
            <Text style={styles.pickerChevron}>▼</Text>
          </TouchableOpacity>
        </View>

        <Input label="Postcode" value={postcode} onChangeText={setPostcode} placeholder="e.g. 6330" keyboardType="number-pad" maxLength={4} />

        <Text style={styles.fieldLabel}>Property type</Text>
        {renderChipGroup(PROPERTY_TYPES, propertyType, setPropertyType)}
        <View style={styles.spacer} />

        <Text style={styles.fieldLabel}>Bedrooms</Text>
        {renderChipGroup(BEDROOMS, bedrooms, setBedrooms)}
        <View style={styles.spacer} />

        <Text style={styles.fieldLabel}>Bathrooms</Text>
        {renderChipGroup(BATHROOMS, bathrooms, setBathrooms)}

        {/* Optional — Landlord */}
        <Text style={styles.sectionHeader}>Owner / Landlord (optional)</Text>
        <Input label="Name" value={landlordName} onChangeText={setLandlordName} placeholder="Owner full name" />
        <Input label="Email" value={landlordEmail} onChangeText={setLandlordEmail} placeholder="owner@example.com" keyboardType="email-address" autoComplete="email" />
        <Input label="Phone" value={landlordPhone} onChangeText={setLandlordPhone} placeholder="e.g. 0412 345 678" keyboardType="phone-pad" />

        {/* Optional — Tenant */}
        <Text style={styles.sectionHeader}>Current Tenant (optional)</Text>
        <Input label="Name" value={tenantName} onChangeText={setTenantName} placeholder="Tenant full name" />
        <Input label="Email" value={tenantEmail} onChangeText={setTenantEmail} placeholder="tenant@example.com" keyboardType="email-address" autoComplete="email" />
        <Input label="Phone" value={tenantPhone} onChangeText={setTenantPhone} placeholder="e.g. 0412 345 678" keyboardType="phone-pad" />

        <Button title="Save Changes" onPress={handleSave} loading={saving} style={styles.saveBtn} />
      </ScrollView>

      {/* State picker modal */}
      <Modal visible={showStatePicker} transparent animationType="fade" onRequestClose={() => setShowStatePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatePicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select state</Text>
            <FlatList
              data={AUSTRALIAN_STATES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.stateOption, item.value === state && styles.stateOptionSelected]}
                  onPress={() => { setState(item.value); setShowStatePicker(false); }}
                >
                  <Text style={[styles.stateOptionText, item.value === state && styles.stateOptionTextSelected]}>{item.label}</Text>
                  {item.value === state && <Text style={styles.checkmark}>✓</Text>}
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
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  loadError: { fontSize: 15, color: '#DC2626', marginBottom: 12 },
  goBackBtn: { paddingVertical: 8 },
  goBackText: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backText: { fontSize: 16, color: '#2563EB', fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  backSpacer: { width: 40 },
  errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: 14, color: '#DC2626' },
  sectionHeader: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16, marginTop: 8 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, backgroundColor: '#F9FAFB', paddingHorizontal: 14, paddingVertical: 12 },
  pickerText: { fontSize: 16, color: '#111827' },
  pickerChevron: { fontSize: 12, color: '#6B7280' },
  spacer: { height: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  chipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  chipText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#2563EB', fontWeight: '600' },
  saveBtn: { marginTop: 24 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 32 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center' },
  stateOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8 },
  stateOptionSelected: { backgroundColor: '#EFF6FF' },
  stateOptionText: { fontSize: 16, color: '#374151' },
  stateOptionTextSelected: { color: '#2563EB', fontWeight: '600' },
  checkmark: { fontSize: 18, color: '#2563EB', fontWeight: '700' },
});
