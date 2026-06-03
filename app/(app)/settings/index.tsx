import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { upsertProfile } from '@/lib/profile';
import { Button } from '@/components/Button';
import type { ProfileUpsert } from '@/lib/profile';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUSTRALIAN_STATES = [
  { label: 'WA', value: 'WA' }, { label: 'NSW', value: 'NSW' },
  { label: 'VIC', value: 'VIC' }, { label: 'QLD', value: 'QLD' },
  { label: 'SA', value: 'SA' },   { label: 'TAS', value: 'TAS' },
  { label: 'ACT', value: 'ACT' }, { label: 'NT', value: 'NT' },
];

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const BUILD_NUMBER = Constants.expoConfig?.android?.versionCode ?? 1;

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function SaveToast({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity]);
  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
      <Text style={styles.toastText}>Saved</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Toggle Row
// ---------------------------------------------------------------------------

function ToggleRow({ label, value, onToggle, locked }: { label: string; value: boolean; onToggle?: () => void; locked?: boolean }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={locked ? undefined : onToggle}
      activeOpacity={locked ? 1 : 0.6}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
        {locked && <Ionicons name="lock-closed" size={12} color="#9CA3AF" style={{ marginRight: 2 }} />}
        <View style={[styles.toggleKnob, value ? styles.toggleKnobOn : styles.toggleKnobOff]} />
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Link Row
// ---------------------------------------------------------------------------

function LinkRow({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color="#6B7280" style={styles.rowIcon} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const { profile, signOut, refreshProfile } = useAuth();

  // Profile edit state
  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultState, setDefaultState] = useState('WA');
  const [showPhotoTimestamps, setShowPhotoTimestamps] = useState(true);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Usage count
  const [reportCount, setReportCount] = useState(0);

  // ------------------------------------------------------------------
  // Pre-populate from profile
  // ------------------------------------------------------------------
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setAgencyName(profile.agency_name ?? '');
      setPhone(profile.phone ?? '');
      setDefaultState(profile.default_state ?? 'WA');
      setShowPhotoTimestamps(profile.show_photo_timestamps ?? true);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { refreshProfile(); }, [refreshProfile]));

  // ------------------------------------------------------------------
  // Usage count
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!profile) return;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    supabase
      .from('inspections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .gte('created_at', firstOfMonth)
      .neq('status', 'draft')
      .then(({ count }) => setReportCount(count ?? 0));
  }, [profile]);

  // ------------------------------------------------------------------
  // Save profile
  // ------------------------------------------------------------------
  async function handleSaveProfile() {
    if (!profile) return;
    setSaving(true);
    const payload: ProfileUpsert = {
      id: profile.id,
      full_name: fullName.trim() || profile.full_name,
      agency_name: agencyName.trim() || null,
      phone: phone.trim() || null,
      email: profile.email,
      default_state: defaultState,
      show_photo_timestamps: showPhotoTimestamps,
    };
    const { success } = await upsertProfile(payload);
    setSaving(false);
    if (success) {
      await refreshProfile();
      setDirty(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } else {
      Alert.alert('Error', 'Failed to save profile.');
    }
  }

  // ------------------------------------------------------------------
  // Sign out
  // ------------------------------------------------------------------
  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          try { await supabase.auth.signOut(); }
          catch { Alert.alert('Error', 'Failed to sign out.'); }
        },
      },
    ]);
  }

  // ------------------------------------------------------------------
  // Delete account
  // ------------------------------------------------------------------
  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all inspection data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account', style: 'destructive',
          onPress: () => Alert.alert(
            'Contact Support',
            'Please contact support@roommark.com.au to delete your account.',
          ),
        },
      ],
    );
  }

  // ------------------------------------------------------------------
  // Safe Linking
  // ------------------------------------------------------------------
  function openURL(url: string) {
    try { Linking.openURL(url); } catch { /* ignore */ }
  }

  // ------------------------------------------------------------------
  // Mark dirty
  // ------------------------------------------------------------------
  function trackChange<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setDirty(true);
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* ============================================================ */}
        {/* SECTION 1 — Profile                                           */}
        {/* ============================================================ */}
        <Text style={styles.sectionHeader}>Profile</Text>
        <View style={styles.card}>
          <Field label="Full name" value={fullName} onChangeText={(t) => trackChange(setFullName, t)} placeholder="Your name" />
          <Field label="Agency name" value={agencyName} onChangeText={(t) => trackChange(setAgencyName, t)} placeholder="Optional" />
          <Field label="Phone" value={phone} onChangeText={(t) => trackChange(setPhone, t)} placeholder="Optional" keyboardType="phone-pad" />
          <View style={styles.readOnlyField}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValueMuted}>{profile?.email ?? ''}</Text>
          </View>
          <View style={styles.pickerField}>
            <Text style={styles.fieldLabel}>Default state</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowStatePicker(true)}>
              <Text style={styles.pickerText}>{defaultState}</Text>
              <Text style={styles.pickerChevron}>▼</Text>
            </TouchableOpacity>
          </View>
          {dirty && (
            <Button title="Save Profile" onPress={handleSaveProfile} loading={saving} style={styles.saveBtn} />
          )}
        </View>

        {/* ============================================================ */}
        {/* SECTION 2 — Agency Branding                                   */}
        {/* ============================================================ */}
        <Text style={styles.sectionHeader}>Report Branding</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('Logo Upload', 'Logo upload available after next build.')}
          >
            <View style={styles.rowLeft}>
              <View style={styles.logoPlaceholder}>
                <Ionicons name="business-outline" size={22} color="#9CA3AF" />
              </View>
              <View>
                <Text style={styles.rowLabel}>Agency Logo</Text>
                <Text style={styles.rowHint}>Upload</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.readOnlyField}>
            <Text style={styles.fieldLabel}>Inspector name on reports</Text>
            <Text style={styles.fieldValueMuted}>{profile?.full_name ?? 'Not set'}</Text>
            <Text style={styles.fieldHint}>Edit above to change</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.previewNote}>
            Your agency name and logo appear on all generated PDF reports.
          </Text>
        </View>

        {/* ============================================================ */}
        {/* SECTION 3 — Subscription                                      */}
        {/* ============================================================ */}
        <Text style={styles.sectionHeader}>Subscription</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Current plan</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Free Plan</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.readOnlyField}>
            <Text style={styles.fieldValue}>{reportCount} of 3 free reports used this month</Text>
          </View>
          <Button
            title="Upgrade to Pro"
            onPress={() => Alert.alert(
              'Coming Soon',
              "Pro subscriptions coming soon. You'll be notified when RoomMark Pro launches.",
            )}
            style={styles.upgradeBtn}
          />
          <Text style={styles.previewNote}>
            Pro — unlimited reports, AI voice input, agency branding · ~$22 AUD/month
          </Text>
        </View>

        {/* ============================================================ */}
        {/* SECTION 4 — App Preferences                                   */}
        {/* ============================================================ */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setShowStatePicker(true)}>
            <Text style={styles.rowLabel}>Default state for new inspections</Text>
            <View style={styles.badgeSmall}>
              <Text style={styles.badgeSmallText}>{defaultState}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <ToggleRow label="AI disclaimer on reports" value={true} locked />
          <View style={styles.divider} />
          <ToggleRow
            label="Include photo timestamps"
            value={showPhotoTimestamps}
            onToggle={() => trackChange(setShowPhotoTimestamps, !showPhotoTimestamps)}
          />
        </View>

        {/* ============================================================ */}
        {/* SECTION 5 — Support                                           */}
        {/* ============================================================ */}
        <Text style={styles.sectionHeader}>Support</Text>
        <View style={styles.card}>
          <LinkRow label="Send Feedback" icon="mail-outline" onPress={() => openURL('mailto:support@roommark.com.au')} />
          <View style={styles.divider} />
          <LinkRow label="Privacy Policy" icon="document-outline" onPress={() => openURL('https://roommark.com.au/privacy')} />
          <View style={styles.divider} />
          <LinkRow label="Terms of Service" icon="document-text-outline" onPress={() => openURL('https://roommark.com.au/terms')} />
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={18} color="#6B7280" style={styles.rowIcon} />
              <Text style={styles.rowLabel}>App version</Text>
            </View>
            <Text style={styles.fieldValueMuted}>Version {APP_VERSION} ({BUILD_NUMBER})</Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* SECTION 6 — Account (danger zone)                             */}
        {/* ============================================================ */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <Text style={[styles.rowLabel, { color: '#DC2626' }]}>Sign Out</Text>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
            <Text style={[styles.rowLabel, { color: '#DC2626' }]}>Delete Account</Text>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Toast */}
      <SaveToast visible={showToast} />

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
                  style={[styles.stateOption, item.value === defaultState && styles.stateOptionSelected]}
                  onPress={() => { trackChange(setDefaultState, item.value); setShowStatePicker(false); }}
                >
                  <Text style={[styles.stateOptionText, item.value === defaultState && styles.stateOptionTextSelected]}>
                    {item.label}
                  </Text>
                  {item.value === defaultState && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Field sub-component
// ---------------------------------------------------------------------------

function Field({ label, value, onChangeText, ...rest }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={fStyles.wrap}>
      <Text style={fStyles.label}>{label}</Text>
      <TextInput
        style={fStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#9CA3AF"
        {...rest}
      />
    </View>
  );
}

const fStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  input: {
    fontSize: 16, color: '#111827',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    paddingVertical: 6,
  },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 24 },
  // Sections
  sectionHeader: {
    fontSize: 13, fontWeight: '600', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8,
  },
  card: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24,
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  // Rows
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: { width: 20 },
  rowLabel: { fontSize: 15, color: '#111827', flex: 1 },
  rowHint: { fontSize: 13, color: '#2563EB', fontWeight: '500' },
  // Fields
  readOnlyField: { marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 2 },
  fieldValue: { fontSize: 15, color: '#111827' },
  fieldValueMuted: { fontSize: 15, color: '#9CA3AF' },
  fieldHint: { fontSize: 12, color: '#D1D5DB', marginTop: 2 },
  // Picker
  pickerField: { marginBottom: 14 },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 8 },
  pickerText: { fontSize: 16, color: '#111827' },
  pickerChevron: { fontSize: 12, color: '#6B7280' },
  // Toggle
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  toggleOn: { backgroundColor: '#2563EB', justifyContent: 'flex-end' },
  toggleOff: { backgroundColor: '#D1D5DB' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', elevation: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 1 },
  toggleKnobOn: {},
  toggleKnobOff: {},
  // Badges
  planBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 6 },
  planBadgeText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  badgeSmall: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  badgeSmallText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  // Logo
  logoPlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  // Preview
  previewNote: { fontSize: 13, color: '#9CA3AF', lineHeight: 18, marginTop: 4 },
  // Save
  saveBtn: { marginTop: 12 },
  upgradeBtn: { marginTop: 14, marginBottom: 6 },
  // Toast
  toast: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  toastText: { fontSize: 14, fontWeight: '600', color: '#16A34A' },
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
