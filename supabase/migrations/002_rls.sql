-- ============================================================================
-- RoomMark: 002_rls.sql
-- Row Level Security — every table locked to its owning user
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Users can insert their own profile (auth trigger also uses this)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Users can delete their own profile (cascades to all owned data)
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. properties
-- ----------------------------------------------------------------------------
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select_own" ON public.properties
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "properties_insert_own" ON public.properties
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "properties_update_own" ON public.properties
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "properties_delete_own" ON public.properties
  FOR DELETE USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. inspections
-- ----------------------------------------------------------------------------
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspections_select_own" ON public.inspections
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "inspections_insert_own" ON public.inspections
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "inspections_update_own" ON public.inspections
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "inspections_delete_own" ON public.inspections
  FOR DELETE USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. rooms — ownership via inspection.user_id
-- ----------------------------------------------------------------------------
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select_own" ON public.rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = rooms.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_insert_own" ON public.rooms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = rooms.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_update_own" ON public.rooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = rooms.inspection_id
        AND inspections.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = rooms.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_delete_own" ON public.rooms
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = rooms.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 5. room_items — ownership via room → inspection.user_id
-- ----------------------------------------------------------------------------
ALTER TABLE public.room_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_items_select_own" ON public.room_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_items.room_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "room_items_insert_own" ON public.room_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_items.room_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "room_items_update_own" ON public.room_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_items.room_id
        AND inspections.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_items.room_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "room_items_delete_own" ON public.room_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_items.room_id
        AND inspections.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 6. room_photos — ownership via room → inspection.user_id
-- ----------------------------------------------------------------------------
ALTER TABLE public.room_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_photos_select_own" ON public.room_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_photos.room_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "room_photos_insert_own" ON public.room_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_photos.room_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "room_photos_update_own" ON public.room_photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_photos.room_id
        AND inspections.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_photos.room_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "room_photos_delete_own" ON public.room_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.rooms
        JOIN public.inspections ON inspections.id = rooms.inspection_id
      WHERE rooms.id = room_photos.room_id
        AND inspections.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 7. maintenance_items — ownership via inspection.user_id
-- ----------------------------------------------------------------------------
ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_items_select_own" ON public.maintenance_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = maintenance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_items_insert_own" ON public.maintenance_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = maintenance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_items_update_own" ON public.maintenance_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = maintenance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = maintenance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_items_delete_own" ON public.maintenance_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = maintenance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 8. compliance_items — ownership via inspection.user_id
-- ----------------------------------------------------------------------------
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_items_select_own" ON public.compliance_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = compliance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "compliance_items_insert_own" ON public.compliance_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = compliance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "compliance_items_update_own" ON public.compliance_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = compliance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = compliance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "compliance_items_delete_own" ON public.compliance_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.inspections
      WHERE inspections.id = compliance_items.inspection_id
        AND inspections.user_id = auth.uid()
    )
  );
