import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_ROOMS_BY_PROPERTY, getPrescribedItems } from '@/lib/roomItems';
import { Button } from '@/components/Button';
import type { Property, InspectionInsert, RoomInsert, RoomItemInsert } from '@/lib/types';
import type { RoomItemTemplate } from '@/constants/roomTemplates';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i);

const INSPECTION_TYPES = [
  {
    key: 'ingoing' as const,
    title: 'Ingoing Condition Report',
    subtitle: 'New tenant moving in',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    key: 'routine' as const,
    title: 'Routine Inspection',
    subtitle: 'Periodic inspection during tenancy',
    color: '#16A34A',
    bg: '#F0FDF4',
  },
  {
    key: 'outgoing' as const,
    title: 'Outgoing Condition Report',
    subtitle: 'Tenant vacating',
    color: '#D97706',
    bg: '#FFFBEB',
  },
];

function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Date Picker Modal (custom, no native modules)
// ---------------------------------------------------------------------------

function DatePickerModal({
  visible,
  date,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  date: Date;
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}) {
  const [day, setDay] = useState(date.getDate());
  const [month, setMonth] = useState(date.getMonth());
  const [year, setYear] = useState(date.getFullYear());

  useEffect(() => {
    if (visible) {
      setDay(date.getDate());
      setMonth(date.getMonth());
      setYear(date.getFullYear());
    }
  }, [visible, date]);

  // Clamp day to valid range for selected month/year
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInMonth);

  function handleConfirm() {
    onConfirm(new Date(year, month, clampedDay));
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.dpOverlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.dpContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.dpTitle}>Select Date</Text>

          <View style={styles.dpPickers}>
            {/* Day */}
            <View style={styles.dpColumn}>
              <Text style={styles.dpColLabel}>Day</Text>
              <ScrollView style={styles.dpScroll} showsVerticalScrollIndicator={false}>
                {DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dpOption, d === clampedDay && styles.dpOptionSelected]}
                    onPress={() => setDay(d)}
                  >
                    <Text
                      style={[styles.dpOptionText, d === clampedDay && styles.dpOptionTextSelected]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Month */}
            <View style={styles.dpColumn}>
              <Text style={styles.dpColLabel}>Month</Text>
              <ScrollView style={styles.dpScroll} showsVerticalScrollIndicator={false}>
                {MONTHS_SHORT.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.dpOption, i === month && styles.dpOptionSelected]}
                    onPress={() => setMonth(i)}
                  >
                    <Text
                      style={[styles.dpOptionText, i === month && styles.dpOptionTextSelected]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Year */}
            <View style={styles.dpColumn}>
              <Text style={styles.dpColLabel}>Year</Text>
              <ScrollView style={styles.dpScroll} showsVerticalScrollIndicator={false}>
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.dpOption, y === year && styles.dpOptionSelected]}
                    onPress={() => setYear(y)}
                  >
                    <Text
                      style={[styles.dpOptionText, y === year && styles.dpOptionTextSelected]}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.dpActions}>
            <TouchableOpacity onPress={onCancel} style={styles.dpCancelBtn}>
              <Text style={styles.dpCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.dpConfirmBtn}>
              <Text style={styles.dpConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Number Stepper
// ---------------------------------------------------------------------------

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Ionicons name="remove" size={20} color={value <= min ? '#D1D5DB' : '#2563EB'} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Ionicons name="add" size={20} color={value >= max ? '#D1D5DB' : '#2563EB'} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function NewInspectionScreen() {
  const { profile } = useAuth();

  // --- Wizard state ---
  const [step, setStep] = useState(1);

  // Step 1
  const [properties, setProperties] = useState<Property[]>([]);
  const [propLoading, setPropLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Step 2
  const [inspectionType, setInspectionType] = useState<'ingoing' | 'routine' | 'outgoing' | null>(null);
  const [existingIngoing, setExistingIngoing] = useState<{ id: string; inspection_date: string } | null>(null);
  const [ingoingChecked, setIngoingChecked] = useState(false);

  // Step 3
  const [inspectionDate, setInspectionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tenantNames, setTenantNames] = useState('');
  const [keysIssued, setKeysIssued] = useState(0);
  const [waterMeter, setWaterMeter] = useState('');
  const [gasMeter, setGasMeter] = useState('');
  const [gasNotConnected, setGasNotConnected] = useState(false);
  const [electricityMeter, setElectricityMeter] = useState('');

  // Global
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------------------------
  // Fetch properties
  // ------------------------------------------------------------------
  const fetchProperties = useCallback(async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProperties(data as Property[]);
    setPropLoading(false);
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Reload properties when returning from Add Property
  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [fetchProperties]),
  );

  // ------------------------------------------------------------------
  // Step 2: Check for existing ingoing when outgoing selected
  // ------------------------------------------------------------------
  async function checkIngoing(propertyId: string) {
    setIngoingChecked(false);
    const { data } = await supabase
      .from('inspections')
      .select('id, inspection_date')
      .eq('property_id', propertyId)
      .eq('inspection_type', 'ingoing')
      .order('inspection_date', { ascending: false })
      .limit(1)
      .single();
    setExistingIngoing(data as { id: string; inspection_date: string } | null);
    setIngoingChecked(true);
  }

  // ------------------------------------------------------------------
  // Step navigation
  // ------------------------------------------------------------------
  function goToStep2() {
    if (!selectedProperty) return;
    setError(null);
    setStep(2);
  }

  function goToStep3(type: 'ingoing' | 'routine' | 'outgoing') {
    setInspectionType(type);
    // Pre-fill tenant names from property
    if (selectedProperty?.tenant_name) {
      setTenantNames(selectedProperty.tenant_name);
    }
    // Check for ingoing on outgoing
    if (type === 'outgoing' && selectedProperty) {
      checkIngoing(selectedProperty.id);
    } else {
      setIngoingChecked(true);
    }
    setError(null);
    setStep(3);
  }

  // ------------------------------------------------------------------
  // Submit — create inspection + rooms + items
  // ------------------------------------------------------------------
  async function handleBeginInspection() {
    if (!selectedProperty || !inspectionType || !profile) return;
    setError(null);
    setLoading(true);

    try {
      // 1. Insert inspection
      const inspectionInsert: InspectionInsert = {
        user_id: profile.id,
        property_id: selectedProperty.id,
        inspection_type: inspectionType,
        state: selectedProperty.state,
        status: 'draft',
        inspector_name: profile.full_name || profile.email || 'Inspector',
        inspection_date: inspectionDate.toISOString().split('T')[0],
        inspection_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
        ingoing_id: inspectionType === 'outgoing' ? existingIngoing?.id ?? null : null,
        keys_issued: inspectionType !== 'routine' ? keysIssued : null,
        keys_returned: null,
        water_meter: waterMeter.trim() || null,
        gas_meter: gasNotConnected ? 'Not connected' : gasMeter.trim() || null,
        electricity_meter: electricityMeter.trim() || null,
        overall_notes: null,
        pdf_url: null,
        sent_at: null,
      };

      const { data: newInspection, error: inspError } = await supabase
        .from('inspections')
        .insert(inspectionInsert)
        .select('id')
        .single();

      if (inspError || !newInspection) {
        throw new Error(inspError?.message ?? 'Failed to create inspection');
      }

      const inspectionId = newInspection.id;

      // 2. Generate room list
      const beds = selectedProperty.bedrooms ?? 3;
      const baths = selectedProperty.bathrooms ?? 1;
      const roomDefs = DEFAULT_ROOMS_BY_PROPERTY(beds, baths);

      // 3. Insert rooms
      const roomInserts: RoomInsert[] = roomDefs.map((def) => ({
        inspection_id: inspectionId,
        room_name: def.room_name,
        room_type: def.room_type,
        room_order: def.room_order,
        status: 'pending' as const,
        overall_condition: null,
        general_notes: null,
      }));

      const { data: newRooms, error: roomsError } = await supabase
        .from('rooms')
        .insert(roomInserts)
        .select('id, room_type');

      if (roomsError || !newRooms) {
        throw new Error(roomsError?.message ?? 'Failed to create rooms');
      }

      // 4. Insert prescribed room_items for each room
      const itemInserts: RoomItemInsert[] = [];
      for (const room of newRooms) {
        const templates: RoomItemTemplate[] = getPrescribedItems(
          selectedProperty.state,
          room.room_type,
        );
        for (const tmpl of templates) {
          itemInserts.push({
            room_id: room.id,
            item_key: tmpl.key,
            item_label: tmpl.label,
            is_prescribed: true,
            clean: null,
            undamaged: null,
            working: null,
            notes: null,
            flagged: false,
          });
        }
      }

      if (itemInserts.length > 0) {
        const { error: itemsError } = await supabase
          .from('room_items')
          .insert(itemInserts);

        if (itemsError) {
          throw new Error(itemsError.message ?? 'Failed to create room items');
        }
      }

      // 5. Navigate to room list (replace so back doesn't return to wizard)
      router.replace(`/(app)/inspection/${inspectionId}/rooms`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Step validity
  // ------------------------------------------------------------------
  const step1Valid = selectedProperty !== null;
  const step2Valid = inspectionType !== null;
  const step3Valid = inspectionType !== null; // All fields optional in step 3

  // ------------------------------------------------------------------
  // Filtered properties
  // ------------------------------------------------------------------
  const filteredProps = search.trim()
    ? properties.filter(
        (p) =>
          p.address.toLowerCase().includes(search.toLowerCase()) ||
          p.suburb.toLowerCase().includes(search.toLowerCase()),
      )
    : properties;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>
            {step > 1 ? '← Back' : '← Cancel'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Inspection</Text>
        <View style={styles.backSpacer} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                s <= step ? styles.stepDotActive : null,
              ]}
            >
              <Text style={[styles.stepDotText, s <= step && styles.stepDotTextActive]}>
                {s < step ? '✓' : s}
              </Text>
            </View>
            <Text style={[styles.stepLabel, s <= step && styles.stepLabelActive]}>
              {s === 1 ? 'Property' : s === 2 ? 'Type' : 'Details'}
            </Text>
            {s < 3 && <View style={[styles.stepLine, s < step && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ================================================================ */}
      {/* STEP 1 — Property selection                                      */}
      {/* ================================================================ */}
      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepPrompt}>Select a property</Text>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search properties"
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            )}
          </View>

          {/* Property list */}
          {propLoading ? (
            <ActivityIndicator size="large" color="#2563EB" style={styles.loadingSpinner} />
          ) : (
            <FlatList
              data={filteredProps}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => {
                const selected = selectedProperty?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.propRow, selected && styles.propRowSelected]}
                    activeOpacity={0.6}
                    onPress={() => setSelectedProperty(item)}
                  >
                    <View style={styles.propRowContent}>
                      <Text style={styles.propAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                      <Text style={styles.propSuburb}>
                        {item.suburb} · {item.state}
                        {item.bedrooms != null ? ` · ${item.bedrooms} bed` : ''}
                        {item.bathrooms != null ? ` · ${item.bathrooms} bath` : ''}
                      </Text>
                    </View>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={filteredProps.length === 0 ? styles.listEmpty : undefined}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No properties found</Text>
                </View>
              }
            />
          )}

          {/* Add Property button */}
          <TouchableOpacity
            style={styles.addPropBtn}
            onPress={() => router.push('/(app)/properties/new')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
            <Text style={styles.addPropText}>Add New Property</Text>
          </TouchableOpacity>

          {/* Next */}
          <Button
            title="Next"
            onPress={goToStep2}
            disabled={!step1Valid}
            style={styles.nextBtn}
          />
        </View>
      )}

      {/* ================================================================ */}
      {/* STEP 2 — Inspection type                                         */}
      {/* ================================================================ */}
      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepPrompt}>Select inspection type</Text>

          <View style={styles.typeCards}>
            {INSPECTION_TYPES.map((t) => {
              const active = inspectionType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeCard,
                    { borderLeftColor: t.color, borderLeftWidth: 4 },
                    active && { backgroundColor: t.bg, borderColor: t.color },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setInspectionType(t.key)}
                >
                  <Text style={styles.typeCardTitle}>{t.title}</Text>
                  <Text style={styles.typeCardSub}>{t.subtitle}</Text>
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={t.color}
                      style={styles.typeCardCheck}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Ingoing check for outgoing */}
          {inspectionType === 'outgoing' && ingoingChecked && (
            existingIngoing ? (
              <View style={styles.ingoingBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.ingoingBannerText}>
                  Ingoing report found — {formatDate(new Date(existingIngoing.inspection_date))}. This report will compare against it.
                </Text>
              </View>
            ) : (
              <View style={styles.ingoingWarning}>
                <Ionicons name="warning-outline" size={18} color="#D97706" />
                <Text style={styles.ingoingWarningText}>
                  No ingoing report found. Bond claims may have limited evidential support.
                </Text>
              </View>
            )
          )}

          <View style={styles.stepActions}>
            <Button
              title="Back"
              onPress={() => setStep(1)}
              variant="secondary"
              style={styles.backBtn}
            />
            <Button
              title="Next"
              onPress={() => inspectionType && goToStep3(inspectionType)}
              disabled={!step2Valid}
              style={styles.nextBtn}
            />
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* STEP 3 — Confirmation                                            */}
      {/* ================================================================ */}
      {step === 3 && (
        <ScrollView
          style={styles.stepScroll}
          contentContainerStyle={styles.stepScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepPrompt}>Confirm inspection details</Text>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Property</Text>
              <Text style={styles.summaryValue}>{selectedProperty?.address}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Suburb</Text>
              <Text style={styles.summaryValue}>{selectedProperty?.suburb}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type</Text>
              <View style={[styles.badgeSmall, { backgroundColor: INSPECTION_TYPES.find(t => t.key === inspectionType)?.bg }]}>
                <Text style={[styles.badgeSmallText, { color: INSPECTION_TYPES.find(t => t.key === inspectionType)?.color }]}>
                  {inspectionType ? inspectionType.charAt(0).toUpperCase() + inspectionType.slice(1) : ''}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>State</Text>
              <Text style={styles.summaryValue}>{selectedProperty?.state}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Inspector</Text>
              <Text style={styles.summaryValue}>{profile?.full_name || profile?.email}</Text>
            </View>

            {/* Date — tappable */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Text style={styles.summaryLink}>{formatDate(inspectionDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* Time — display only */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>
                {new Date().toTimeString().split(' ')[0].slice(0, 5)}
              </Text>
            </View>
          </View>

          {/* Tenant names */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tenant name(s)</Text>
            <TextInput
              style={styles.textInput}
              value={tenantNames}
              onChangeText={setTenantNames}
              placeholder={selectedProperty?.tenant_name || 'Enter tenant names'}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Keys issued (ingoing/outgoing only) */}
          {inspectionType !== 'routine' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Keys issued</Text>
              <NumberStepper value={keysIssued} onChange={setKeysIssued} />
            </View>
          )}

          {/* Meter readings */}
          <Text style={styles.sectionHeader}>Utility Meter Readings</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Water meter</Text>
            <TextInput
              style={styles.textInput}
              value={waterMeter}
              onChangeText={setWaterMeter}
              placeholder="Reading"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Gas meter</Text>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setGasNotConnected(!gasNotConnected)}
              >
                <View style={[styles.toggleBox, gasNotConnected && styles.toggleBoxActive]}>
                  {gasNotConnected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                </View>
                <Text style={styles.toggleLabel}>Not connected</Text>
              </TouchableOpacity>
            </View>
            {!gasNotConnected && (
              <TextInput
                style={styles.textInput}
                value={gasMeter}
                onChangeText={setGasMeter}
                placeholder="Reading"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Electricity meter</Text>
            <TextInput
              style={styles.textInput}
              value={electricityMeter}
              onChangeText={setElectricityMeter}
              placeholder="Reading"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Actions */}
          <View style={styles.stepActions}>
            <Button
              title="Back"
              onPress={() => setStep(2)}
              variant="secondary"
              style={styles.backBtn}
            />
            <Button
              title="Begin Inspection"
              onPress={handleBeginInspection}
              loading={loading}
              disabled={!step3Valid || loading}
              style={styles.nextBtn}
            />
          </View>
        </ScrollView>
      )}

      {/* Date picker modal */}
      <DatePickerModal
        visible={showDatePicker}
        date={inspectionDate}
        onConfirm={(d) => { setInspectionDate(d); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />
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
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  backSpacer: { width: 60 },
  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#2563EB',
  },
  // Error
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  // Step content
  stepContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  stepScroll: {
    flex: 1,
  },
  stepScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  stepPrompt: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 10,
  },
  // Property list
  list: { flex: 1 },
  listEmpty: { flexGrow: 1 },
  loadingSpinner: { marginTop: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  propRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  propRowSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  propRowContent: { flex: 1, marginRight: 12 },
  propAddress: { fontSize: 15, fontWeight: '600', color: '#111827' },
  propSuburb: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addPropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginBottom: 12,
  },
  addPropText: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
  nextBtn: { flex: 1, marginLeft: 8 },
  backBtn: { flex: 1, marginRight: 8 },
  // Step 2
  typeCards: { gap: 12, marginBottom: 16 },
  typeCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  typeCardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  typeCardSub: { fontSize: 14, color: '#6B7280' },
  typeCardCheck: { position: 'absolute', top: 14, right: 14 },
  ingoingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  ingoingBannerText: { flex: 1, fontSize: 14, color: '#166534', lineHeight: 20 },
  ingoingWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ingoingWarningText: { flex: 1, fontSize: 14, color: '#92400E', lineHeight: 20 },
  stepActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  // Step 3
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  summaryLink: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeSmallText: { fontSize: 12, fontWeight: '600' },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
    marginTop: 8,
  },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 6 },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  toggleLabel: { fontSize: 13, color: '#6B7280' },
  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  stepperBtnDisabled: {
    backgroundColor: '#F3F4F6',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    minWidth: 48,
    textAlign: 'center',
  },
  // Date picker modal
  dpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dpContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  dpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  dpPickers: {
    flexDirection: 'row',
    gap: 12,
  },
  dpColumn: { flex: 1 },
  dpColLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  dpScroll: { maxHeight: 200 },
  dpOption: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
  dpOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  dpOptionText: { fontSize: 16, color: '#6B7280' },
  dpOptionTextSelected: { color: '#2563EB', fontWeight: '700' },
  dpActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  dpCancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  dpCancelText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  dpConfirmBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  dpConfirmText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
});
