-- =====================================================
-- Add icon column to quick_links table
-- PostgreSQL version
-- =====================================================
ALTER TABLE quick_links ADD COLUMN IF NOT EXISTS icon VARCHAR(255) AFTER description;
