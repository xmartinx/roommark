import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { AudioModule } from 'expo-audio';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getPrescribedItems } from '@/lib/roomItems';
import { processRoomObservation, arrayBufferToBase64 } from '@/lib/edgeFunction';
import type {
  Room,
  RoomItem,
  Inspection,
  Property,
  AssessedItem,
  MaintenanceItemSuggestion,
  MaintenanceItemInsert,
} from '@/lib/types';
import type { RoomItemTemplate } from '@/constants/roomTemplates';

// ---------------------------------------------------------------------------
// Native module imports — WILL NOT WORK UNTIL EAS REBUILD (Rule 1)
// These imports are correct and ready for after the rebuild.
// ---------------------------------------------------------------------------

// import { useAudioRecorder } from 'expo-audio';
// import { File } from 'expo-file-system';
// import * as ImageManipulator from 'expo-image-manipulator';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  good: { label: 'Good', color: '#16A34A' },
  fair: { label: 'Fair', color: '#D97706' },
  poor: { label: 'Poor', color: '#DC2626' },
};

const CONDITION_CYCLE: Array<'good' | 'fair' | 'poor'> = ['good', 'fair', 'poor'];

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

function formatDateStr(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RoomAssessmentScreen() {
  const { id: inspectionId, roomId } = useLocalSearchParams<{
    id: string;
    roomId: string;
  }>();
  const { session, profile } = useAuth();

  // --- Data ---
  const [room, setRoom] = useState<Room | null>(null);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [templates, setTemplates] = useState<RoomItemTemplate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // --- UI state ---
  type ScreenState = 'recording' | 'review';
  const [screenState, setScreenState] = useState<ScreenState>('recording');

  // --- Recording state ---
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<string[]>([]); // URIs
  const [processing, setProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('Transcribing...');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [error, setError] = useState<string | null>(null);

  // --- Review state ---
  const [overallCondition, setOverallCondition] = useState<'good' | 'fair' | 'poor' | null>(null);
  const [generalNotes, setGeneralNotes] = useState<string | null>(null);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // --- Flagged item resolver ---
  const [resolvingItem, setResolvingItem] = useState<RoomItem | null>(null);
  const [showResolver, setShowResolver] = useState(false);

  // --- Notes editor ---
  const [editingNotes, setEditingNotes] = useState<RoomItem | null>(null);
  const [editNotesText, setEditNotesText] = useState('');

  // --- Add item ---
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');

  // --- Photo placeholder ---
  const [photoCaptureItemId, setPhotoCaptureItemId] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Load everything
  // ------------------------------------------------------------------
  const loadData = useCallback(async () => {
    if (!roomId || !inspectionId) return;
    try {
      // Room
      const { data: r } = await supabase
        .from('rooms').select('*').eq('id', roomId).single();
      if (r) setRoom(r as Room);

      // Items
      const { data: itemList } = await supabase
        .from('room_items').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
      if (itemList) setItems(itemList as RoomItem[]);

      // Inspection
      const { data: insp } = await supabase
        .from('inspections').select('*').eq('id', inspectionId).single();
      if (insp) setInspection(insp as Inspection);

      // Property
      if (insp) {
        const { data: prop } = await supabase
          .from('properties').select('*').eq('id', (insp as Inspection).property_id).single();
        if (prop) {
          setProperty(prop as Property);
          setTemplates(getPrescribedItems((prop as Property).state, r?.room_type ?? 'other'));
        }
      }

      // Determine initial state
      const hasAssessed = (itemList ?? []).some(
        (i: RoomItem) => i.clean !== null || i.undamaged !== null || i.working !== null,
      );
      const overall = r?.overall_condition as 'good' | 'fair' | 'poor' | null;
      if (overall) setOverallCondition(overall);
      if (r?.general_notes) setGeneralNotes(r.general_notes);
      if (hasAssessed || r?.status === 'complete') {
        setScreenState('review');
      }
    } finally {
      setDataLoading(false);
    }
  }, [roomId, inspectionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ------------------------------------------------------------------
  // Pulse animation for record button
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isRecording) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // ------------------------------------------------------------------
  // Timer
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ------------------------------------------------------------------
  // Recording — requires expo-audio native module (EAS rebuild)
  // RoomMark Rule 11: request permission + set audio mode before recording
  // ------------------------------------------------------------------
  async function startRecording() {
    setError(null);

    // 1. Request microphone permission
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Microphone Permission Required',
        'RoomMark needs microphone access to record your observations. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { try { Linking.openSettings(); } catch { /* ignore */ } } },
        ],
      );
      return;
    }

    // 2. Configure audio mode for recording
    try {
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    } catch {
      // Audio mode failure is non-fatal on some devices
    }

    // 3. Start recording
    // useAudioRecorder.start() — activates after EAS rebuild
    setIsRecording(true);
    setElapsed(0);
  }

  async function stopRecording() {
    // useAudioRecorder.stop() — activates after EAS rebuild
    setIsRecording(false);
    const fakeUri = `recording-${Date.now()}.m4a`;
    setRecordings((prev) => [...prev, fakeUri]);
  }

  function toggleRecording() {
    if (isRecording) { stopRecording(); } else { startRecording(); }
  }

  // ------------------------------------------------------------------
  // Process observations
  // ------------------------------------------------------------------
  async function handleProcess() {
    if (recordings.length === 0 || !inspection || !property || !profile || !room) return;
    setProcessing(true);
    setProcessingLabel('Transcribing...');
    setError(null);

    try {
      // Read most recent recording as base64
      // After rebuild: const file = new File(recordings[recordings.length - 1]);
      // After rebuild: const base64 = await file.base64();
      // For now, send a placeholder that will work after rebuild
      const audioBase64 = ''; // Will be populated by File class after rebuild

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
      const accessToken = session?.access_token ?? '';

      if (!accessToken) {
        setError('Session expired. Please sign in again.');
        setProcessing(false);
        return;
      }

      setProcessingLabel('Analysing...');

      const result = await processRoomObservation({
        audioBase64,
        roomName: room.room_name,
        roomType: room.room_type,
        state: property.state,
        reportType: inspection.inspection_type,
        address: property.address,
        date: inspection.inspection_date,
        inspectionId,
        roomId,
        prescribedItems: templates,
        accessToken,
        supabaseUrl,
      });

      if (result.success) {
        await applyAssessment(result.assessment);
        setScreenState('review');
      } else if (result.error === 'parse_failed') {
        // Show raw transcript, allow manual entry
        Alert.alert(
          'AI could not structure the response',
          'The transcript was saved. You can enter assessments manually.',
          [
            { text: 'Enter Manually', onPress: () => setScreenState('review') },
            { text: 'Retry', style: 'cancel' },
          ],
        );
      } else {
        setError(
          result.error === 'transcription_failed'
            ? 'Could not transcribe audio. Please try again.'
            : 'AI processing failed. Please try again.',
        );
      }
    } catch (e) {
      setError('Network error. Your recordings are saved locally.');
    } finally {
      setProcessing(false);
    }
  }

  // ------------------------------------------------------------------
  // Apply AI assessment to Supabase items
  // ------------------------------------------------------------------
  async function applyAssessment(assessment: { items: Record<string, AssessedItem>; overall_condition: string; general_notes: string | null; maintenance_items: MaintenanceItemSuggestion[] }) {
    // Update room_items matching by item_key
    const updates = items
      .filter((item) => assessment.items[item.item_key])
      .map((item) => {
        const ai = assessment.items[item.item_key];
        return {
          id: item.id,
          clean: ai.clean,
          undamaged: ai.undamaged,
          working: ai.working,
          notes: ai.notes,
          flagged: ai.flagged,
        };
      });

    if (updates.length > 0) {
      await supabase.from('room_items').upsert(updates);
    }

    // Insert maintenance items
    if (assessment.maintenance_items.length > 0 && inspectionId && roomId) {
      const mInserts: MaintenanceItemInsert[] = assessment.maintenance_items.map((m) => ({
        inspection_id: inspectionId,
        room_id: roomId,
        description: m.description,
        priority: m.priority,
        responsibility: m.responsibility,
        resolved: false,
      }));
      await supabase.from('maintenance_items').insert(mInserts);
    }

    // Update room
    const cond = assessment.overall_condition as 'good' | 'fair' | 'poor';
    setOverallCondition(cond);
    setGeneralNotes(assessment.general_notes);
    await supabase
      .from('rooms')
      .update({
        overall_condition: cond,
        general_notes: assessment.general_notes,
        status: 'complete',
      })
      .eq('id', roomId);

    // Reload data
    await loadData();
  }

  // ------------------------------------------------------------------
  // Item toggle handlers (optimistic, debounced)
  // ------------------------------------------------------------------
  function toggleItemField(itemId: string, field: 'clean' | 'undamaged' | 'working') {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const current = item[field];
        let next: boolean | null;
        if (current === null) next = true;
        else if (current === true) next = false;
        else next = null;
        return { ...item, [field]: next, flagged: false };
      }),
    );
    scheduleSave(itemId);
  }

  function updateItemNotes(itemId: string, notes: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes } : item)),
    );
    scheduleSave(itemId);
  }

  function scheduleSave(itemId: string) {
    const existing = saveTimers.current.get(itemId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      const { error } = await supabase
        .from('room_items')
        .update({
          clean: item.clean,
          undamaged: item.undamaged,
          working: item.working,
          notes: item.notes,
          flagged: item.flagged,
        })
        .eq('id', itemId);
      if (error) {
        // Revert on error
        loadData();
      }
    }, 800);
    saveTimers.current.set(itemId, timer);
  }

  // ------------------------------------------------------------------
  // Cycle overall condition
  // ------------------------------------------------------------------
  function cycleCondition() {
    if (!overallCondition) {
      setOverallCondition('good');
      supabase.from('rooms').update({ overall_condition: 'good' }).eq('id', roomId);
      return;
    }
    const idx = CONDITION_CYCLE.indexOf(overallCondition);
    const next = CONDITION_CYCLE[(idx + 1) % 3];
    setOverallCondition(next);
    supabase.from('rooms').update({ overall_condition: next }).eq('id', roomId);
  }

  // ------------------------------------------------------------------
  // Add custom item
  // ------------------------------------------------------------------
  async function handleAddItem() {
    if (!newItemLabel.trim() || !roomId) return;
    const { data: newItem } = await supabase
      .from('room_items')
      .insert({
        room_id: roomId,
        item_key: `custom_${Date.now()}`,
        item_label: newItemLabel.trim(),
        is_prescribed: false,
        clean: null,
        undamaged: null,
        working: null,
        notes: null,
        flagged: false,
      })
      .select('*')
      .single();
    if (newItem) {
      setItems((prev) => [...prev, newItem as RoomItem]);
    }
    setNewItemLabel('');
    setShowAddItem(false);
  }

  // ------------------------------------------------------------------
  // Flagged item resolver
  // ------------------------------------------------------------------
  function openResolver(item: RoomItem) {
    setResolvingItem(item);
    setShowResolver(true);
  }

  async function unflagItem(itemId: string) {
    await supabase.from('room_items').update({ flagged: false }).eq('id', itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, flagged: false } : i)));
    setShowResolver(false);
  }

  // ------------------------------------------------------------------
  // Photo placeholder
  // ------------------------------------------------------------------
  function handlePhotoCapture(itemId: string) {
    setPhotoCaptureItemId(itemId);
    Alert.alert(
      'Photo capture',
      'Photo capture will be available after the next EAS build. expo-image-picker and expo-image-manipulator are native modules that require a rebuild.',
      [{ text: 'OK' }],
    );
  }

  // ------------------------------------------------------------------
  // Skip room (mark N/A)
  // ------------------------------------------------------------------
  function handleSkip() {
    Alert.alert(
      'Skip this room?',
      `Mark ${room?.room_name ?? 'this room'} as N/A? It will be excluded from the report.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('rooms').update({ status: 'na' }).eq('id', roomId);
            router.back();
          },
        },
      ],
    );
  }

  // ------------------------------------------------------------------
  // Done / Back
  // ------------------------------------------------------------------
  async function handleDone() {
    // Check if any items assessed
    const hasAssessed = items.some(
      (i) => i.clean !== null || i.undamaged !== null || i.working !== null,
    );
    if (hasAssessed && room?.status !== 'complete') {
      await supabase.from('rooms').update({ status: 'complete' }).eq('id', roomId);
    }
    router.back();
  }

  // ------------------------------------------------------------------
  // Hint text (first 4 items)
  // ------------------------------------------------------------------
  const hintItems = templates.slice(0, 4).map((t) => t.label).join(', ');

  // ------------------------------------------------------------------
  // Flagged items count
  // ------------------------------------------------------------------
  const flaggedItems = items.filter((i) => i.flagged);
  const hasWorkingItems = templates.some((t) => t.hasWorking);

  // ------------------------------------------------------------------
  // Render: RECORDING state
  // ------------------------------------------------------------------
  function renderRecording() {
    return (
      <View style={styles.recordingContainer}>
        {/* Room name */}
        <Text style={styles.roomHeading}>{room?.room_name ?? 'Room'}</Text>
        <Text style={styles.recordingHint}>
          Tap and speak your observations for this room
        </Text>

        {/* Record button */}
        <View style={styles.recordBtnArea}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.recordBtn,
                isRecording ? styles.recordBtnActive : null,
              ]}
              onPress={toggleRecording}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={48}
                color={isRecording ? '#FFFFFF' : '#2563EB'}
              />
            </TouchableOpacity>
          </Animated.View>
          {isRecording && (
            <>
              <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
              {/* Simulated audio level bars */}
              <View style={styles.waveformWrap}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: isRecording ? 8 + Math.random() * 24 : 4,
                        backgroundColor: isRecording ? '#EF4444' : '#E5E7EB',
                      },
                    ]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* Hint */}
        {recordings.length === 0 && !isRecording && (
          <Text style={styles.hint}>
            Tip: mention {hintItems}
          </Text>
        )}

        {/* Recording count */}
        {recordings.length > 0 && !isRecording && (
          <View style={styles.recordingsInfo}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.recordingsCount}>
              {recordings.length} recording(s) ready to process
            </Text>
          </View>
        )}

        {/* Process button */}
        {recordings.length > 0 && !isRecording && (
          <View style={styles.processActions}>
            <TouchableOpacity
              style={styles.processBtn}
              onPress={handleProcess}
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <Text style={styles.processBtnText}>Process Observations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recordAgainBtn}
              onPress={() => toggleRecording()}
            >
              <Text style={styles.recordAgainText}>Record Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Processing overlay */}
        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.processingLabel}>{processingLabel}</Text>
          </View>
        )}

        {/* Skip */}
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip this room</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Render: REVIEW state
  // ------------------------------------------------------------------
  function renderReview() {
    return (
      <View style={styles.reviewContainer}>
        {/* Header */}
        <View style={styles.reviewHeader}>
          <Text style={styles.roomHeading}>{room?.room_name ?? 'Room'}</Text>
          <TouchableOpacity
            style={[
              styles.conditionBadge,
              { backgroundColor: overallCondition ? CONDITION_LABELS[overallCondition].color + '1A' : '#F3F4F6' },
            ]}
            onPress={cycleCondition}
          >
            <Text style={[
              styles.conditionText,
              { color: overallCondition ? CONDITION_LABELS[overallCondition].color : '#9CA3AF' },
            ]}>
              {overallCondition ? CONDITION_LABELS[overallCondition].label : 'Tap to rate'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Flagged banner */}
        {flaggedItems.length > 0 && (
          <View style={styles.flaggedBanner}>
            <Ionicons name="warning-outline" size={16} color="#D97706" />
            <Text style={styles.flaggedBannerText}>
              {flaggedItems.length} item(s) need your attention — tap ⚠️ to resolve
            </Text>
          </View>
        )}

        {/* Items list */}
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.itemsList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const tmpl = templates.find((t) => t.key === item.item_key);
            const showWorking = tmpl?.hasWorking ?? true;
            return (
              <View style={styles.itemRow}>
                {/* Label + flag */}
                <View style={styles.itemHeader}>
                  <View style={styles.itemLabelRow}>
                    {item.is_prescribed ? null : (
                      <Ionicons name="add-circle-outline" size={14} color="#9CA3AF" style={styles.customIcon} />
                    )}
                    <Text style={styles.itemLabel} numberOfLines={1}>
                      {item.item_label}
                    </Text>
                  </View>
                  <View style={styles.itemActionsRight}>
                    {item.flagged && (
                      <TouchableOpacity onPress={() => openResolver(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.flagIcon}>⚠️</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handlePhotoCapture(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="camera-outline" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* C / U / W toggles */}
                <View style={styles.toggleRow}>
                  <ToggleBtn label="C" value={item.clean} onPress={() => toggleItemField(item.id, 'clean')} />
                  <ToggleBtn label="U" value={item.undamaged} onPress={() => toggleItemField(item.id, 'undamaged')} />
                  {showWorking ? (
                    <ToggleBtn label="W" value={item.working} onPress={() => toggleItemField(item.id, 'working')} />
                  ) : (
                    <View style={styles.toggleNa}>
                      <Text style={styles.toggleNaText}>W N/A</Text>
                    </View>
                  )}
                </View>

                {/* Notes */}
                <TouchableOpacity
                  style={styles.notesPreview}
                  onPress={() => { setEditingNotes(item); setEditNotesText(item.notes ?? ''); }}
                >
                  <Text style={[styles.notesText, !item.notes && styles.notesPlaceholder]} numberOfLines={1}>
                    {item.notes || 'Tap to add notes'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />

        {/* Add Item */}
        <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowAddItem(true)}>
          <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
          <Text style={styles.addItemText}>Add Item</Text>
        </TouchableOpacity>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={router.back} style={styles.bottomBack}>
            <Text style={styles.bottomBackText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomDone} onPress={handleDone}>
            <Text style={styles.bottomDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Render: item toggles helper
  // ------------------------------------------------------------------
  function ToggleBtn({ label, value, onPress }: { label: string; value: boolean | null; onPress: () => void }) {
    const isTrue = value === true;
    const isFalse = value === false;
    const isNull = value === null;

    let bg = '#F3F4F6';
    let color = '#9CA3AF';
    if (isTrue) { bg = '#DCFCE7'; color = '#16A34A'; }
    if (isFalse) { bg = '#FEE2E2'; color = '#DC2626'; }

    return (
      <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: bg }]} onPress={onPress}>
        <Text style={[styles.toggleBtnLabel, { color: '#6B7280' }]}>{label}</Text>
        <Text style={[styles.toggleBtnValue, { color }]}>
          {isTrue ? 'Y' : isFalse ? 'N' : '—'}
        </Text>
      </TouchableOpacity>
    );
  }

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------
  if (dataLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Main
  // ------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* State toggle (dev only — taps allow switching state; remove after testing) */}
      {/* <TouchableOpacity onPress={() => setScreenState(s => s === 'recording' ? 'review' : 'recording')}>
        <Text>Switch: {screenState}</Text>
      </TouchableOpacity> */}

      {screenState === 'recording' ? renderRecording() : renderReview()}

      {/* ================================================================ */}
      {/* Notes editor modal                                                */}
      {/* ================================================================ */}
      <Modal visible={!!editingNotes} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Notes</Text>
            <Text style={styles.modalSubtitle}>{editingNotes?.item_label}</Text>
            <TextInput
              style={styles.modalInput}
              value={editNotesText}
              onChangeText={setEditNotesText}
              multiline
              numberOfLines={4}
              placeholder="Enter condition notes..."
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditingNotes(null)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={() => {
                  if (editingNotes) {
                    updateItemNotes(editingNotes.id, editNotesText);
                    setEditingNotes(null);
                  }
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* Flagged item resolver modal                                       */}
      {/* ================================================================ */}
      <Modal visible={showResolver} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Resolve Flag</Text>
            <Text style={styles.modalSubtitle}>{resolvingItem?.item_label}</Text>
            <Text style={styles.resolverNote}>{resolvingItem?.notes || 'No notes'}</Text>
            <View style={styles.resolverActions}>
              <TouchableOpacity
                style={styles.resolverEditBtn}
                onPress={() => {
                  if (resolvingItem) {
                    setEditingNotes(resolvingItem);
                    setEditNotesText(resolvingItem.notes ?? '');
                  }
                  setShowResolver(false);
                }}
              >
                <Text style={styles.resolverEditText}>Edit Manually</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resolverClearBtn}
                onPress={() => resolvingItem && unflagItem(resolvingItem.id)}
              >
                <Text style={styles.resolverClearText}>Clear Flag</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowResolver(false)} style={styles.resolverCancelBtn}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* Add item modal                                                    */}
      {/* ================================================================ */}
      <Modal visible={showAddItem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Custom Item</Text>
            <TextInput
              style={styles.modalInput}
              value={newItemLabel}
              onChangeText={setNewItemLabel}
              placeholder="e.g. Security Camera"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddItem(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddItem}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles (condensed)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },

  // --- RECORDING ---
  recordingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  roomHeading: { fontSize: 26, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  recordingHint: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  recordBtnArea: { alignItems: 'center', marginBottom: 20 },
  recordBtn: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 4, borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  recordBtnActive: {
    backgroundColor: '#EF4444', borderColor: '#DC2626',
  },
  timer: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  waveformWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 32, gap: 4, marginTop: 8,
  },
  waveBar: { width: 4, borderRadius: 2 },
  hint: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32, marginTop: 4 },
  recordingsInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, backgroundColor: '#F0FDF4',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  recordingsCount: { fontSize: 14, color: '#166534', fontWeight: '500' },
  processActions: { marginTop: 20, alignItems: 'center', gap: 12 },
  processBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 12,
  },
  processBtnText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  recordAgainBtn: { paddingVertical: 10 },
  recordAgainText: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
  errorBanner: {
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12,
    marginHorizontal: 24, marginTop: 16,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontSize: 14, color: '#DC2626' },
  processingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, margin: 24,
  },
  processingLabel: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  skipBtn: { position: 'absolute', bottom: 40 },
  skipText: { fontSize: 14, color: '#9CA3AF' },

  // --- REVIEW ---
  reviewContainer: { flex: 1, paddingTop: 56 },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, marginBottom: 16,
  },
  conditionBadge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
  },
  conditionText: { fontSize: 14, fontWeight: '600' },
  flaggedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', marginHorizontal: 24, marginBottom: 12,
    padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  flaggedBannerText: { flex: 1, fontSize: 13, color: '#92400E' },
  itemsList: { paddingHorizontal: 24, paddingBottom: 16 },
  itemRow: {
    backgroundColor: '#F9FAFB', borderRadius: 10,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  itemHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  itemLabelRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  customIcon: { marginRight: 4 },
  itemLabel: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  itemActionsRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flagIcon: { fontSize: 16 },
  toggleRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  toggleBtn: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 6, gap: 6,
  },
  toggleBtnLabel: { fontSize: 12, fontWeight: '600' },
  toggleBtnValue: { fontSize: 14, fontWeight: '700' },
  toggleNa: {
    flex: 1, alignItems: 'center',
    paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 6,
  },
  toggleNaText: { fontSize: 11, color: '#D1D5DB', fontWeight: '500' },
  notesPreview: {
    backgroundColor: '#FFFFFF', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  notesText: { fontSize: 13, color: '#374151' },
  notesPlaceholder: { color: '#D1D5DB' },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 12, gap: 6,
  },
  addItemText: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  bottomBack: { paddingVertical: 4 },
  bottomBackText: { fontSize: 16, color: '#2563EB', fontWeight: '500' },
  bottomDone: {
    backgroundColor: '#2563EB', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 10,
  },
  bottomDoneText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },

  // --- MODALS ---
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    backgroundColor: '#F9FAFB', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827', minHeight: 80, textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalCancel: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  modalSave: {
    backgroundColor: '#2563EB', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 10,
  },
  modalSaveText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },

  // --- Resolver ---
  resolverNote: {
    fontSize: 14, color: '#374151', backgroundColor: '#F9FAFB',
    padding: 12, borderRadius: 8, marginBottom: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  resolverActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  resolverEditBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center',
  },
  resolverEditText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  resolverClearBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#16A34A', alignItems: 'center',
  },
  resolverClearText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  resolverCancelBtn: { alignItems: 'center', paddingTop: 4 },
});
