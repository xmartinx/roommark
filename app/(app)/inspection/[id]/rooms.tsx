import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getPrescribedItems } from '@/lib/roomItems';
import { Button } from '@/components/Button';
import type { Room, RoomItem, Inspection, Property } from '@/lib/types';
import type { RoomItemTemplate } from '@/constants/roomTemplates';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOM_TYPES = [
  'entry', 'living', 'dining', 'kitchen', 'bedroom',
  'bathroom', 'laundry', 'garage', 'outdoor', 'other',
];

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RoomRowData {
  room: Room;
  itemCount: number;
  flaggedCount: number;
  assessedCount: number;
}

export default function RoomsScreen() {
  const { id: inspectionId } = useLocalSearchParams<{ id: string }>();

  // --- Data ---
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<RoomRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Add Room modal ---
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('other');

  // --- Inline rename ---
  const [renameRoomId, setRenameRoomId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // --- Generate report ---
  const [showFlaggedConfirm, setShowFlaggedConfirm] = useState(false);

  // ------------------------------------------------------------------
  // Fetch inspection, property, rooms, and item counts
  // ------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    if (!inspectionId) return;

    // Inspection
    const { data: insp } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();
    if (insp) setInspection(insp as Inspection);

    // Property
    if (insp) {
      const { data: prop } = await supabase
        .from('properties')
        .select('*')
        .eq('id', (insp as Inspection).property_id)
        .single();
      if (prop) setProperty(prop as Property);
    }

    // Rooms
    const { data: roomList } = await supabase
      .from('rooms')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('room_order', { ascending: true });

    if (!roomList) { setLoading(false); return; }

    // Fetch item counts per room
    const rows: RoomRowData[] = [];
    for (const r of roomList) {
      const room = r as Room;
      const { data: items } = await supabase
        .from('room_items')
        .select('*')
        .eq('room_id', room.id);

      const itemList = (items ?? []) as RoomItem[];
      const assessed = itemList.filter(
        (i) => i.clean !== null || i.undamaged !== null || i.working !== null,
      ).length;
      rows.push({
        room,
        itemCount: itemList.length,
        flaggedCount: itemList.filter((i) => i.flagged).length,
        assessedCount: assessed,
      });
    }
    setRooms(rows);
    setLoading(false);
  }, [inspectionId]);

  useFocusEffect(
    useCallback(() => { fetchData().finally(() => setLoading(false)); }, [fetchData]),
  );

  // ------------------------------------------------------------------
  // Back handler
  // ------------------------------------------------------------------
  function handleBack() {
    Alert.alert('Save and exit?', 'Your inspection is saved as draft.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', onPress: () => router.back() },
    ]);
  }

  // ------------------------------------------------------------------
  // Mark room as N/A
  // ------------------------------------------------------------------
  function confirmNA(room: RoomRowData) {
    Alert.alert(
      `Mark ${room.room.room_name} as N/A?`,
      'This room will be excluded from the report.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark N/A',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('rooms')
              .update({ status: 'na' })
              .eq('id', room.room.id);
            fetchData();
          },
        },
      ],
    );
  }

  // ------------------------------------------------------------------
  // Inline rename
  // ------------------------------------------------------------------
  function startRename(room: RoomRowData) {
    setRenameRoomId(room.room.id);
    setRenameText(room.room.room_name);
  }

  async function commitRename() {
    if (!renameRoomId || !renameText.trim()) {
      setRenameRoomId(null);
      return;
    }
    await supabase
      .from('rooms')
      .update({ room_name: renameText.trim() })
      .eq('id', renameRoomId);
    setRenameRoomId(null);
    fetchData();
  }

  // ------------------------------------------------------------------
  // Long press action sheet
  // ------------------------------------------------------------------
  function handleLongPress(room: RoomRowData) {
    const options: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [
      {
        text: 'Mark as N/A',
        onPress: () => confirmNA(room),
      },
      {
        text: 'Rename room',
        onPress: () => startRename(room),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ];
    // Use Alert for a simple action sheet on both platforms
    Alert.alert(room.room.room_name, 'Choose an action', options);
  }

  // ------------------------------------------------------------------
  // Add custom room
  // ------------------------------------------------------------------
  async function handleAddRoom() {
    if (!newRoomName.trim() || !inspectionId) return;

    const maxOrder = rooms.reduce((max, r) => Math.max(max, r.room.room_order), 0);
    const { data: newRoom } = await supabase
      .from('rooms')
      .insert({
        inspection_id: inspectionId,
        room_name: newRoomName.trim(),
        room_type: newRoomType,
        room_order: maxOrder + 1,
        status: 'pending',
      })
      .select('id, room_type')
      .single();

    if (newRoom) {
      // Optionally insert prescribed items for the selected room type
      const templates: RoomItemTemplate[] = getPrescribedItems(
        property?.state ?? 'WA',
        newRoom.room_type,
      );
      if (templates.length > 0) {
        await supabase.from('room_items').insert(
          templates.map((tmpl) => ({
            room_id: newRoom.id,
            item_key: tmpl.key,
            item_label: tmpl.label,
            is_prescribed: false, // custom rooms get non-prescribed items
            clean: null,
            undamaged: null,
            working: null,
            notes: null,
            flagged: false,
          })),
        );
      }
    }

    setNewRoomName('');
    setNewRoomType('other');
    setShowAddRoom(false);
    fetchData();
  }

  // ------------------------------------------------------------------
  // Save draft
  // ------------------------------------------------------------------
  async function handleSaveDraft() {
    setSaving(true);
    // Already draft — just a UX reassurance touch
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    Alert.alert('Saved', 'Inspection draft is up to date.');
  }

  // ------------------------------------------------------------------
  // Generate Report
  // ------------------------------------------------------------------
  function handleGenerateReport() {
    const allDone = rooms.every((r) => r.room.status !== 'pending');
    if (!allDone) return;

    const totalFlagged = rooms.reduce((sum, r) => sum + r.flaggedCount, 0);
    if (totalFlagged > 0) {
      setShowFlaggedConfirm(true);
    } else {
      router.push(`/(app)/inspection/${inspectionId}/preview`);
    }
  }

  // ------------------------------------------------------------------
  // Computed
  // ------------------------------------------------------------------
  const activeRooms = rooms.filter((r) => r.room.status !== 'na');
  const assessedRooms = activeRooms.filter((r) => r.room.status === 'complete').length;
  const totalFlagged = rooms.reduce((sum, r) => sum + r.flaggedCount, 0);
  const allDone = activeRooms.length > 0 && activeRooms.every((r) => r.room.status !== 'pending');
  const progress = activeRooms.length > 0 ? assessedRooms / activeRooms.length : 0;

  // ------------------------------------------------------------------
  // Render: room row
  // ------------------------------------------------------------------
  function renderRoom({ item }: { item: RoomRowData }) {
    const room = item.room;
    const isNA = room.status === 'na';
    const isComplete = room.status === 'complete';
    const hasFlagged = item.flaggedCount > 0;

    let statusIcon: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
    let statusColor = '#D1D5DB';
    if (isComplete) { statusIcon = 'checkmark-circle'; statusColor = '#16A34A'; }
    if (isNA) { statusIcon = 'remove-circle'; statusColor = '#D1D5DB'; }

    let summary = 'Not assessed';
    if (isNA) summary = 'N/A';
    else if (item.assessedCount > 0) {
      summary = `${item.itemCount} items · ${item.assessedCount} assessed`;
      if (item.flaggedCount > 0) summary += ` · ${item.flaggedCount} flagged`;
    } else {
      summary = `${item.itemCount} items · Not assessed`;
    }

    let borderColor = 'transparent';
    if (hasFlagged) borderColor = '#D97706';
    else if (isComplete) borderColor = '#16A34A';

    return (
      <TouchableOpacity
        style={[styles.roomRow, { borderLeftColor: borderColor, borderLeftWidth: borderColor !== 'transparent' ? 3 : 0 }]}
        activeOpacity={0.6}
        onPress={() => router.push(`/(app)/inspection/${inspectionId}/room/${room.id}`)}
        onLongPress={() => handleLongPress(item)}
      >
        {renameRoomId === room.id ? (
          <View style={styles.renameWrap}>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              onSubmitEditing={commitRename}
              onBlur={commitRename}
              autoFocus
              selectTextOnFocus
            />
          </View>
        ) : (
          <>
            <Ionicons name={statusIcon} size={22} color={statusColor} style={styles.roomIcon} />
            <View style={styles.roomContent}>
              <Text style={[styles.roomName, isNA && styles.roomNameNA]}>
                {room.room_name}
              </Text>
              <Text style={[styles.roomSummary, isNA && styles.roomSummaryNA]}>
                {summary}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </>
        )}
      </TouchableOpacity>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Inspection not found (RLS mismatch, deleted, or invalid ID)
  if (!inspection) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>Inspection not found</Text>
        <TouchableOpacity
          style={styles.errorBackBtn}
          onPress={() => router.replace('/(app)')}
        >
          <Text style={styles.errorBackText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerAddress} numberOfLines={1}>
            {property?.address ?? 'Inspection'}
          </Text>
          {inspection && (
            <View style={[styles.badge, { backgroundColor: TYPE_COLORS[inspection.inspection_type]?.bg }]}>
              <Text style={[styles.badgeText, { color: TYPE_COLORS[inspection.inspection_type]?.text }]}>
                {TYPE_LABELS[inspection.inspection_type]}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.backSpacer} />
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <Text style={styles.progressText}>
          {assessedRooms} of {activeRooms.length} rooms assessed
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      {/* Room list */}
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.room.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Room */}
      <TouchableOpacity style={styles.addRoomBtn} onPress={() => setShowAddRoom(true)}>
        <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
        <Text style={styles.addRoomText}>Add Room</Text>
      </TouchableOpacity>

      {/* Additional Items */}
      <TouchableOpacity
        style={styles.additionalCard}
        onPress={() => router.push(`/(app)/inspection/${inspectionId}/additional`)}
      >
        <Ionicons name="list-outline" size={20} color="#6B7280" />
        <Text style={styles.additionalText}>
          Additional Items — Smoke alarms, keys, meters
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
      </TouchableOpacity>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={handleSaveDraft} style={styles.saveDraftBtn}>
          {saving ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <Text style={styles.saveDraftText}>Save Draft</Text>
          )}
        </TouchableOpacity>
        <View style={styles.generateBtnWrap}>
          <Button
            title="Generate Report"
            onPress={handleGenerateReport}
            disabled={!allDone}
          />
        </View>
      </View>

      {/* ================================================================ */}
      {/* Add Room modal                                                    */}
      {/* ================================================================ */}
      <Modal visible={showAddRoom} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Room</Text>

            <Text style={styles.modalLabel}>Room name</Text>
            <TextInput
              style={styles.modalInput}
              value={newRoomName}
              onChangeText={setNewRoomName}
              placeholder="e.g. Study, Ensuite"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Room type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroller}>
              {ROOM_TYPES.map((t) => {
                const active = newRoomType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setNewRoomType(t)}
                  >
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddRoom(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAddBtn, !newRoomName.trim() && styles.modalAddBtnDisabled]}
                onPress={handleAddRoom}
                disabled={!newRoomName.trim()}
              >
                <Text style={styles.modalAddText}>Add Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* Flagged items confirmation                                        */}
      {/* ================================================================ */}
      <Modal visible={showFlaggedConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.flaggedModal}>
            <Ionicons name="flag-outline" size={28} color="#D97706" style={styles.flaggedIcon} />
            <Text style={styles.flaggedTitle}>
              {totalFlagged} item{totalFlagged > 1 ? 's' : ''} flagged for review
            </Text>
            <Text style={styles.flaggedSub}>
              Generate report anyway?
            </Text>
            <View style={styles.flaggedActions}>
              <TouchableOpacity
                style={styles.flaggedReviewBtn}
                onPress={() => setShowFlaggedConfirm(false)}
              >
                <Text style={styles.flaggedReviewText}>Review Flags</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.flaggedGoBtn}
                onPress={() => {
                  setShowFlaggedConfirm(false);
                  router.push(`/(app)/inspection/${inspectionId}/preview`);
                }}
              >
                <Text style={styles.flaggedGoText}>Generate Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 32, gap: 16,
  },
  errorText: { fontSize: 17, fontWeight: '600', color: '#6B7280' },
  errorBackBtn: {
    backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 10, marginTop: 8,
  },
  errorBackText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backText: { fontSize: 16, color: '#2563EB', fontWeight: '500' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerAddress: { fontSize: 15, fontWeight: '600', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  backSpacer: { width: 60 },
  // Progress
  progressWrap: { paddingHorizontal: 24, marginBottom: 16 },
  progressText: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  progressBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: '#2563EB', borderRadius: 3 },
  // Room list
  list: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingBottom: 8 },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  roomIcon: { marginRight: 12 },
  roomContent: { flex: 1, marginRight: 8 },
  roomName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  roomNameNA: { color: '#D1D5DB' },
  roomSummary: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  roomSummaryNA: { color: '#D1D5DB' },
  // Rename
  renameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  renameInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    paddingVertical: 4,
  },
  // Add room
  addRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  addRoomText: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
  // Additional items
  additionalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  additionalText: { flex: 1, fontSize: 14, color: '#6B7280' },
  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  saveDraftBtn: { paddingVertical: 12, paddingHorizontal: 4, minWidth: 80, alignItems: 'center' },
  saveDraftText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  generateBtnWrap: { flex: 1 },
  // Add Room modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  typeScroller: { marginBottom: 20 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  typeChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  typeChipText: { fontSize: 14, color: '#374151' },
  typeChipTextActive: { color: '#2563EB', fontWeight: '600' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCancel: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  modalAddBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalAddBtnDisabled: { opacity: 0.4 },
  modalAddText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  // Flagged confirm modal
  flaggedModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  flaggedIcon: { marginBottom: 12 },
  flaggedTitle: { fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 4 },
  flaggedSub: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  flaggedActions: { flexDirection: 'row', gap: 12, width: '100%' },
  flaggedReviewBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  flaggedReviewText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  flaggedGoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  flaggedGoText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
});
