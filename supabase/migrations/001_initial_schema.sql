-- ============================================================================
-- RoomMark: 001_initial_schema.sql
-- Complete database schema — all 8 tables, indexes, and updated_at triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: auto-update the updated_at column on row modification
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 1. profiles — extends Supabase auth.users
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name       text NOT NULL DEFAULT '',
  agency_name     text,
  phone           text,
  email           text,
  default_state   text NOT NULL DEFAULT 'WA',
  logo_url        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for email lookups (profile search by agency admin, future use)
CREATE INDEX idx_profiles_email ON public.profiles (email);

-- Trigger for updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. properties — rental properties
-- ----------------------------------------------------------------------------
CREATE TABLE public.properties (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address         text NOT NULL,
  suburb          text NOT NULL,
  state           text NOT NULL,
  postcode        text NOT NULL,
  property_type   text,          -- 'house' | 'unit' | 'townhouse' | 'other'
  bedrooms        integer,
  bathrooms       integer,
  landlord_name   text,
  landlord_email  text,
  landlord_phone  text,
  tenant_name     text,
  tenant_email    text,
  tenant_phone    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes: user lookups are the most frequent query
CREATE INDEX idx_properties_user_id ON public.properties (user_id);
CREATE INDEX idx_properties_state    ON public.properties (state);

-- Trigger for updated_at
CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. inspections — condition reports
-- ----------------------------------------------------------------------------
CREATE TABLE public.inspections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id         uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  inspection_type     text NOT NULL,  -- 'ingoing' | 'routine' | 'outgoing'
  state               text NOT NULL,
  status              text NOT NULL DEFAULT 'draft',
                                      -- 'draft' | 'complete' | 'sent'
  inspector_name      text NOT NULL,
  inspection_date     date NOT NULL,
  inspection_time     time,
  ingoing_id          uuid REFERENCES public.inspections(id),
                                      -- for outgoing: links to the ingoing report
  keys_issued         integer,
  keys_returned       integer,
  water_meter         text,
  gas_meter           text,
  electricity_meter   text,
  overall_notes       text,
  pdf_url             text,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes: query by user, property, type, date, and status
CREATE INDEX idx_inspections_user_id      ON public.inspections (user_id);
CREATE INDEX idx_inspections_property_id  ON public.inspections (property_id);
CREATE INDEX idx_inspections_ingoing_id   ON public.inspections (ingoing_id);
CREATE INDEX idx_inspections_status       ON public.inspections (status);
CREATE INDEX idx_inspections_date         ON public.inspections (inspection_date);

-- Trigger for updated_at
CREATE TRIGGER trg_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. rooms — rooms within an inspection
-- ----------------------------------------------------------------------------
CREATE TABLE public.rooms (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id     uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  room_name         text NOT NULL,
  room_type         text NOT NULL,
                    -- 'bedroom' | 'kitchen' | 'bathroom' | 'living' |
                    -- 'dining' | 'laundry' | 'garage' | 'outdoor' | 'other'
  room_order        integer NOT NULL,
  status            text NOT NULL DEFAULT 'pending',
                    -- 'pending' | 'complete' | 'na'
  overall_condition text,  -- 'good' | 'fair' | 'poor'
  general_notes     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes: query by inspection, room type, status
CREATE INDEX idx_rooms_inspection_id ON public.rooms (inspection_id);
CREATE INDEX idx_rooms_status        ON public.rooms (status);

-- Trigger for updated_at
CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. room_items — individual assessed items within a room
-- ----------------------------------------------------------------------------
CREATE TABLE public.room_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  item_key        text NOT NULL,     -- e.g. 'walls_ceiling', 'floor_coverings'
  item_label      text NOT NULL,     -- e.g. 'Walls / Ceiling'
  is_prescribed   boolean NOT NULL DEFAULT true,
                                     -- prescribed items cannot be deleted
  clean           boolean,           -- null = not assessed yet
  undamaged       boolean,           -- null = not assessed yet
  working         boolean,           -- null = not applicable
  notes           text,
  flagged         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes: query by room, item key, flagged status
CREATE INDEX idx_room_items_room_id  ON public.room_items (room_id);
CREATE INDEX idx_room_items_flagged  ON public.room_items (flagged);

-- Trigger for updated_at
CREATE TRIGGER trg_room_items_updated_at
  BEFORE UPDATE ON public.room_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. room_photos — photos associated with a room or a specific item
-- ----------------------------------------------------------------------------
CREATE TABLE public.room_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES public.room_items(id) ON DELETE SET NULL,
                                     -- null = photo is general to the room
  storage_path    text NOT NULL,
  taken_at        timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes: query by room, item
CREATE INDEX idx_room_photos_room_id ON public.room_photos (room_id);
CREATE INDEX idx_room_photos_item_id ON public.room_photos (item_id);

-- Trigger for updated_at
CREATE TRIGGER trg_room_photos_updated_at
  BEFORE UPDATE ON public.room_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. maintenance_items — flagged issues requiring action
-- ----------------------------------------------------------------------------
CREATE TABLE public.maintenance_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  description     text NOT NULL,
  priority        text NOT NULL,     -- 'low' | 'medium' | 'urgent'
  responsibility  text NOT NULL,     -- 'tenant' | 'landlord' | 'unknown'
  resolved        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes: query by inspection, room, priority, resolved status
CREATE INDEX idx_maintenance_inspection_id ON public.maintenance_items (inspection_id);
CREATE INDEX idx_maintenance_room_id       ON public.maintenance_items (room_id);
CREATE INDEX idx_maintenance_resolved      ON public.maintenance_items (resolved);

-- Trigger for updated_at
CREATE TRIGGER trg_maintenance_items_updated_at
  BEFORE UPDATE ON public.maintenance_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. compliance_items — state-specific compliance fields
-- ----------------------------------------------------------------------------
CREATE TABLE public.compliance_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  item_type       text NOT NULL,
                  -- 'smoke_alarm' | 'pool_fence' | 'minimum_standard' |
                  -- 'safety_switch' | 'water_efficiency' | 'key'
  label           text NOT NULL,
  value           text,
  compliant       boolean,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes: query by inspection, item type
CREATE INDEX idx_compliance_inspection_id ON public.compliance_items (inspection_id);
CREATE INDEX idx_compliance_item_type     ON public.compliance_items (item_type);

-- Trigger for updated_at
CREATE TRIGGER trg_compliance_items_updated_at
  BEFORE UPDATE ON public.compliance_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
