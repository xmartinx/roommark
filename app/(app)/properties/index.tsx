import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import type { Property } from '@/lib/types';

const PROPERTY_ICONS: Record<string, string> = {
  house: 'home',
  unit: 'business',
  townhouse: 'home',
  other: 'home',
};

export default function PropertiesListScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ------------------------------------------------------------------
  // Fetch all properties for current user
  // ------------------------------------------------------------------
  const fetchProperties = useCallback(async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProperties(data as Property[]);
    } else {
      setProperties([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProperties().finally(() => setLoading(false));
    }, [fetchProperties]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  }

  // ------------------------------------------------------------------
  // Client-side search filter
  // ------------------------------------------------------------------
  const filtered = search.trim()
    ? properties.filter(
        (p) =>
          p.address.toLowerCase().includes(search.toLowerCase()) ||
          p.suburb.toLowerCase().includes(search.toLowerCase())
      )
    : properties;

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  function bedBathLabel(p: Property): string {
    const parts: string[] = [];
    if (p.bedrooms != null) parts.push(`${p.bedrooms} bed`);
    if (p.bathrooms != null) parts.push(`${p.bathrooms} bath`);
    return parts.length > 0 ? parts.join(' · ') : '';
  }

  function renderRow({ item }: { item: Property }) {
    const iconName =
      (PROPERTY_ICONS[item.property_type ?? ''] ?? 'home') as keyof typeof Ionicons.glyphMap;
    const details = bedBathLabel(item);

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.6}
        onPress={() => router.push(`/(app)/properties/${item.id}`)}
      >
        <View style={styles.rowIcon}>
          <Ionicons name={iconName} size={22} color="#2563EB" />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowAddress} numberOfLines={1}>
            {item.address}
          </Text>
          <Text style={styles.rowSuburb}>
            {item.suburb}
            <Text style={styles.rowState}> · {item.state}</Text>
          </Text>
          {details ? <Text style={styles.rowDetails}>{details}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      </TouchableOpacity>
    );
  }

  function renderEmpty() {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyBox}>
          <Ionicons name="business-outline" size={32} color="#D1D5DB" />
        </View>
        <Text style={styles.emptyTitle}>No properties yet</Text>
        <Text style={styles.emptySubtitle}>Add your first property</Text>
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
        <Text style={styles.title}>Properties</Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/properties/new')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add-circle" size={28} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={18}
          color="#9CA3AF"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by address or suburb"
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            filtered.length === 0 ? styles.listEmpty : styles.list
          }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  rowAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  rowSuburb: {
    fontSize: 13,
    color: '#6B7280',
  },
  rowState: {
    color: '#9CA3AF',
  },
  rowDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Empty
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
