import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import type { Inspection, Property } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InspectionRow {
  inspection: Inspection;
  property: Property | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  ingoing:  { bg: '#DCFCE7', text: '#166534' },
  routine:  { bg: '#DBEAFE', text: '#1E40AF' },
  outgoing: { bg: '#FEF3C7', text: '#92400E' },
};

const TYPE_LABELS: Record<string, string> = {
  ingoing:  'Ingoing',
  routine:  'Routine',
  outgoing: 'Outgoing',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: '#F3F4F6', text: '#374151' },
  complete: { bg: '#DCFCE7', text: '#166534' },
  sent:     { bg: '#DBEAFE', text: '#1E40AF' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Draft inspection within last 2 hours — "Return to Inspection" banner
  const [draftInspection, setDraftInspection] = useState<Inspection | null>(null);

  useEffect(() => {
    if (!profile) return;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    supabase
      .from('inspections')
      .select('*')
      .eq('status', 'draft')
      .gte('updated_at', twoHoursAgo)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setDraftInspection(data as Inspection);
      });
  }, [profile]);

  const displayName = profile?.full_name || 'Inspector';

  // ------------------------------------------------------------------
  // Fetch recent inspections with joined property data
  // ------------------------------------------------------------------
  const fetchInspections = useCallback(async () => {
    // Fetch inspections
    const { data: inspections, error: inspError } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (inspError || !inspections) {
      setRows([]);
      return;
    }

    // Collect unique property IDs and fetch them in a single query
    const propertyIds = [
      ...new Set(inspections.map((i) => i.property_id)),
    ];

    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .in('id', propertyIds);

    const propertyMap = new Map<string, Property>();
    if (properties) {
      for (const p of properties) {
        propertyMap.set(p.id, p as Property);
      }
    }

    // Build rows
    const joined: InspectionRow[] = inspections.map((i) => ({
      inspection: i as Inspection,
      property: propertyMap.get(i.property_id) ?? null,
    }));

    setRows(joined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInspections().finally(() => setLoading(false));
    }, [fetchInspections]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchInspections();
    setRefreshing(false);
  }

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  function renderRow({ item }: { item: InspectionRow }) {
    const insp = item.inspection;
    const prop = item.property;
    const typeStyle = TYPE_COLORS[insp.inspection_type] ?? TYPE_COLORS.ingoing;
    const statusStyle = STATUS_COLORS[insp.status] ?? STATUS_COLORS.draft;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.6}
        onPress={() => router.push(`/(app)/inspection/${insp.id}/rooms`)}
      >
        <View style={styles.rowTop}>
          <View style={styles.rowAddress}>
            <Text style={styles.rowAddressText} numberOfLines={1}>
              {prop ? `${prop.address}, ${prop.suburb}` : 'Unknown property'}
            </Text>
            <Text style={styles.rowState}>{prop?.state ?? ''}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: typeStyle.bg }]}>
            <Text style={[styles.badgeText, { color: typeStyle.text }]}>
              {TYPE_LABELS[insp.inspection_type] ?? insp.inspection_type}
            </Text>
          </View>
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.rowDate}>
            {formatDate(insp.inspection_date)}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {insp.status.charAt(0).toUpperCase() + insp.status.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderEmpty() {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyBox}>
          <Ionicons name="document-text-outline" size={32} color="#D1D5DB" />
        </View>
        <Text style={styles.emptyTitle}>No inspections yet</Text>
        <Text style={styles.emptySubtitle}>
          Tap above to start your first inspection
        </Text>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>RoomMark</Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="settings-outline" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <Text style={styles.greeting}>Hello, {displayName}</Text>

      {/* Return to inspection banner */}
      {draftInspection && (
        <TouchableOpacity
          style={styles.draftBanner}
          onPress={() => router.push(`/(app)/inspection/${draftInspection.id}/rooms`)}
          activeOpacity={0.8}
        >
          <View style={styles.draftBannerLeft}>
            <Ionicons name="hourglass-outline" size={18} color="#2563EB" />
            <Text style={styles.draftBannerText}>
              Inspection in progress — Continue where you left off
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={22} color="#2563EB" />
        </TouchableOpacity>
      )}

      {/* Start inspection CTA */}
      <Button
        title="Start New Inspection"
        onPress={() => router.push('/(app)/inspection/new')}
        style={styles.cta}
      />

      {/* Section label */}
      <Text style={styles.sectionLabel}>Recent Inspections</Text>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.inspection.id}
          renderItem={renderRow}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={rows.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  draftBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 20,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  draftBannerLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
  },
  draftBannerText: { fontSize: 14, fontWeight: '500', color: '#1E40AF', flex: 1 },
  cta: {
    marginHorizontal: 24,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  // List
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  listEmpty: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  // Row
  row: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowAddress: {
    flex: 1,
    marginRight: 12,
  },
  rowAddressText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowState: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Badges
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
