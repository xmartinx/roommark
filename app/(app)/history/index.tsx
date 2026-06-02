import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SectionList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import type { Inspection } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function formatMonthHeader(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

const TYPE_LABELS: Record<string, string> = {
  ingoing: 'Ingoing', routine: 'Routine', outgoing: 'Outgoing',
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

const TYPE_FILTERS = ['All', 'Ingoing', 'Routine', 'Outgoing'] as const;
const STATUS_FILTERS = ['All', 'Draft', 'Complete', 'Sent'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyBrief { address: string; suburb: string; state: string; }
interface InspectionJoined extends Inspection { properties: PropertyBrief | null; }
interface Section { title: string; data: InspectionJoined[]; }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const [allData, setAllData] = useState<InspectionJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(20);

  // ------------------------------------------------------------------
  // Fetch all inspections with joined property data
  // ------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('inspections')
      .select('*, properties(address, suburb, state)')
      .order('inspection_date', { ascending: false });

    if (fetchErr) { setError('Failed to load inspections.'); setLoading(false); return; }
    setAllData((data ?? []) as InspectionJoined[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setLoading(false));
    }, [loadData]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // ------------------------------------------------------------------
  // Apply filters client-side
  // ------------------------------------------------------------------
  let filtered = allData;

  // Search
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((insp) =>
      insp.properties?.address?.toLowerCase().includes(q) ||
      insp.properties?.suburb?.toLowerCase().includes(q) ||
      insp.inspection_type.toLowerCase().includes(q),
    );
  }

  // Type filter
  if (typeFilter !== 'All') {
    filtered = filtered.filter((insp) => typeFilter.toLowerCase() === insp.inspection_type);
  }

  // Status filter
  if (statusFilter !== 'All') {
    filtered = filtered.filter((insp) => statusFilter.toLowerCase() === insp.status);
  }

  // Limit
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  // ------------------------------------------------------------------
  // Group by month for section list
  // ------------------------------------------------------------------
  const sections: Section[] = [];
  for (const insp of visible) {
    const monthKey = formatMonthHeader(insp.inspection_date);
    let section = sections.find((s) => s.title === monthKey);
    if (!section) { section = { title: monthKey, data: [] }; sections.push(section); }
    section.data.push(insp);
  }

  // ------------------------------------------------------------------
  // Render: inspection row
  // ------------------------------------------------------------------
  function renderRow({ item }: { item: InspectionJoined }) {
    const tStyle = TYPE_COLORS[item.inspection_type] ?? TYPE_COLORS.ingoing;
    const sStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    const prop = item.properties;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.6}
        onPress={() => router.push(`/(app)/inspection/${item.id}/rooms`)}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.badge, { backgroundColor: tStyle.bg }]}>
            <Text style={[styles.badgeText, { color: tStyle.text }]}>
              {TYPE_LABELS[item.inspection_type]}
            </Text>
          </View>
          <Text style={styles.rowAddress} numberOfLines={1}>
            {prop?.address ?? 'Unknown property'}
          </Text>
          <Text style={styles.rowSuburb}>
            {prop ? `${prop.suburb}, ${prop.state}` : ''}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowDate}>{formatDate(item.inspection_date)}</Text>
          <View style={[styles.badge, { backgroundColor: sStyle.bg }]}>
            <Text style={[styles.badgeText, { color: sStyle.text }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ------------------------------------------------------------------
  // Render: empty states
  // ------------------------------------------------------------------
  const isFiltering = search.trim() || typeFilter !== 'All' || statusFilter !== 'All';

  function renderEmpty() {
    if (loading) return null;
    if (allData.length === 0) {
      return (
        <View style={styles.empty}>
          <View style={styles.emptyBox}>
            <Ionicons name="time-outline" size={32} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No inspections yet</Text>
          <Text style={styles.emptySubtitle}>Start your first inspection</Text>
          <Button
            title="Start New Inspection"
            onPress={() => router.push('/(app)/inspection/new')}
            style={styles.emptyBtn}
          />
        </View>
      );
    }
    if (isFiltering && filtered.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No inspections match your filters</Text>
          <TouchableOpacity onPress={() => { setSearch(''); setTypeFilter('All'); setStatusFilter('All'); }}>
            <Text style={styles.clearLink}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Render: filter pills
  // ------------------------------------------------------------------
  function renderPills(options: readonly string[], selected: string, onSelect: (v: string) => void) {
    return (
      <View style={styles.pillRow}>
        {options.map((opt) => {
          const active = opt === selected;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.pill, active ? styles.pillActive : null]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Main
  // ------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={(t) => { setSearch(t); setVisibleCount(20); }}
          placeholder="Search inspections"
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setVisibleCount(20); }}>
            <Ionicons name="close-circle" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      {renderPills(TYPE_FILTERS, typeFilter, (v) => { setTypeFilter(v); setVisibleCount(20); })}
      {renderPills(STATUS_FILTERS, statusFilter, (v) => { setStatusFilter(v); setVisibleCount(20); })}

      {/* Loading / content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          renderSectionHeader={({ section: { title: sectionTitle } }) => (
            <Text style={styles.sectionHeader}>{sectionTitle}</Text>
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={sections.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMore}
                onPress={() => setVisibleCount((c) => c + 20)}
              >
                <Text style={styles.loadMoreText}>Load more</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  // Header
  header: {
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 10,
    backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 10 },
  // Pills
  pillRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 8, gap: 6 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  pillActive: { backgroundColor: '#2563EB' },
  pillText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  pillTextActive: { color: '#FFFFFF' },
  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // List
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  listEmpty: { flexGrow: 1, paddingHorizontal: 24 },
  // Section
  sectionHeader: {
    fontSize: 14, fontWeight: '600', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 16, marginBottom: 8,
  },
  // Row
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6',
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowAddress: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 6 },
  rowSuburb: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  rowRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  rowDate: { fontSize: 13, color: '#6B7280' },
  // Badge
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emptyBox: {
    width: 72, height: 72, borderRadius: 12, borderWidth: 2,
    borderColor: '#E5E7EB', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 20 },
  emptyBtn: { minWidth: 200 },
  clearLink: { fontSize: 14, color: '#2563EB', fontWeight: '500', marginTop: 8 },
  errorText: { fontSize: 15, color: '#DC2626' },
  // Load more
  loadMore: { alignItems: 'center', paddingVertical: 16 },
  loadMoreText: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
});
