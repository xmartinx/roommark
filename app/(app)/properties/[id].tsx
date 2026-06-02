import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import type { Property, Inspection } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  house: 'home',
  unit: 'business',
  townhouse: 'home',
  other: 'home',
};

const TYPE_LABELS: Record<string, string> = {
  ingoing: 'Ingoing',
  routine: 'Routine',
  outgoing: 'Outgoing',
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  ingoing:  { bg: '#DCFCE7', text: '#166534' },
  routine:  { bg: '#DBEAFE', text: '#1E40AF' },
  outgoing: { bg: '#FEF3C7', text: '#92400E' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: '#F3F4F6', text: '#374151' },
  complete: { bg: '#DCFCE7', text: '#166534' },
  sent:     { bg: '#DBEAFE', text: '#1E40AF' },
};

// ---------------------------------------------------------------------------
// Section: Contact rows
// ---------------------------------------------------------------------------

function ContactRow({ icon, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.contactRow} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon} size={16} color="#2563EB" style={styles.contactIcon} />
      <Text style={styles.contactValue}>{value}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [property, setProperty] = useState<Property | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setError(null);

    // Fetch property
    const { data: prop, error: propErr } = await supabase
      .from('properties').select('*').eq('id', id).single();
    if (propErr) { setError('Property not found.'); setLoading(false); return; }
    setProperty(prop as Property);

    // Fetch inspections
    const { data: inspList } = await supabase
      .from('inspections')
      .select('*')
      .eq('property_id', id)
      .order('inspection_date', { ascending: false })
      .limit(10);
    if (inspList) setInspections(inspList as Inspection[]);

    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // --- Loading ---
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // --- Error ---
  if (error || !property) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Property not found'}</Text>
      </View>
    );
  }

  const typeIcon = TYPE_ICONS[property.property_type ?? ''] ?? 'home';
  const typeLabel = (property.property_type ?? 'House').charAt(0).toUpperCase() + (property.property_type ?? 'house').slice(1);
  const bedBath = [
    property.bedrooms != null ? `${property.bedrooms} bed` : null,
    property.bathrooms != null ? `${property.bathrooms} bath` : null,
  ].filter(Boolean).join(' · ');
  const hasLandlord = !!(property.landlord_name || property.landlord_email || property.landlord_phone);
  const hasTenant = !!(property.tenant_name || property.tenant_email || property.tenant_phone);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {truncate(property.address, 30)}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(app)/properties/edit/${id}`)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="pencil" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Property info card */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.typeBadge}>
              <Ionicons name={typeIcon} size={18} color="#2563EB" />
              <Text style={styles.typeLabel}>{typeLabel}</Text>
            </View>
            {bedBath ? <Text style={styles.bedBath}>{bedBath}</Text> : null}
          </View>
          <Text style={styles.fullAddress}>{property.address}</Text>
          <Text style={styles.suburbLine}>
            {property.suburb}, {property.state} {property.postcode}
          </Text>
        </View>

        {/* Landlord section */}
        <Text style={styles.sectionHeader}>Owner / Landlord</Text>
        <View style={styles.card}>
          {hasLandlord ? (
            <>
              {property.landlord_name ? <Text style={styles.contactName}>{property.landlord_name}</Text> : null}
              {property.landlord_email ? (
                <ContactRow icon="mail-outline" value={property.landlord_email} onPress={() => Linking.openURL(`mailto:${property.landlord_email}`)} />
              ) : null}
              {property.landlord_phone ? (
                <ContactRow icon="call-outline" value={property.landlord_phone} onPress={() => Linking.openURL(`tel:${property.landlord_phone}`)} />
              ) : null}
            </>
          ) : (
            <Text style={styles.notSet}>Not set — tap edit to add owner details</Text>
          )}
        </View>

        {/* Tenant section */}
        <Text style={styles.sectionHeader}>Current Tenant</Text>
        <View style={styles.card}>
          {hasTenant ? (
            <>
              {property.tenant_name ? <Text style={styles.contactName}>{property.tenant_name}</Text> : null}
              {property.tenant_email ? (
                <ContactRow icon="mail-outline" value={property.tenant_email} onPress={() => Linking.openURL(`mailto:${property.tenant_email}`)} />
              ) : null}
              {property.tenant_phone ? (
                <ContactRow icon="call-outline" value={property.tenant_phone} onPress={() => Linking.openURL(`tel:${property.tenant_phone}`)} />
              ) : null}
            </>
          ) : (
            <Text style={styles.notSet}>Not set — tap edit to add tenant details</Text>
          )}
        </View>

        {/* Inspection history */}
        <Text style={styles.sectionHeader}>Inspection History</Text>
        <View style={styles.card}>
          {inspections.length === 0 ? (
            <Text style={styles.notSet}>No inspections yet for this property</Text>
          ) : (
            inspections.map((insp) => {
              const tStyle = TYPE_COLORS[insp.inspection_type] ?? TYPE_COLORS.ingoing;
              const sStyle = STATUS_COLORS[insp.status] ?? STATUS_COLORS.draft;
              return (
                <TouchableOpacity
                  key={insp.id}
                  style={styles.inspRow}
                  activeOpacity={0.6}
                  onPress={() => router.push(`/(app)/inspection/${insp.id}/rooms`)}
                >
                  <View style={styles.inspLeft}>
                    <View style={[styles.badge, { backgroundColor: tStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: tStyle.text }]}>
                        {TYPE_LABELS[insp.inspection_type]}
                      </Text>
                    </View>
                    <Text style={styles.inspDate}>{formatDate(insp.inspection_date)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: sStyle.bg }]}>
                    <Text style={[styles.badgeText, { color: sStyle.text }]}>
                      {insp.status.charAt(0).toUpperCase() + insp.status.slice(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <Button
          title="Start New Inspection"
          onPress={() => router.push({ pathname: '/(app)/inspection/new', params: { propertyId: id } })}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  errorText: { fontSize: 15, color: '#DC2626' },
  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12,
  },
  backText: { fontSize: 16, color: '#2563EB', fontWeight: '500' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginHorizontal: 8 },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  // Card
  card: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 20,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  bedBath: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  fullAddress: { fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 2 },
  suburbLine: { fontSize: 14, color: '#6B7280' },
  // Section headers
  sectionHeader: {
    fontSize: 14, fontWeight: '600', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  // Contact
  contactName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  contactIcon: { width: 20 },
  contactValue: { fontSize: 14, color: '#2563EB' },
  notSet: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  // Inspection rows
  inspRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  inspLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inspDate: { fontSize: 14, color: '#374151' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
});
