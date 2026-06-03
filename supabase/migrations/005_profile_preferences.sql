-- ============================================================================
-- RoomMark: 005_profile_preferences.sql
-- Add show_photo_timestamps preference to profiles
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN show_photo_timestamps boolean NOT NULL DEFAULT true;
