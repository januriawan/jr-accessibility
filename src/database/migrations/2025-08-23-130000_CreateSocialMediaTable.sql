-- =====================================================
-- Create social_media table
-- PostgreSQL version
-- =====================================================
CREATE TABLE IF NOT EXISTS social_media (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  UUID,
    updated_at  TIMESTAMP,
    updated_by  UUID,
    deleted_at  TIMESTAMP,
    deleted_by  UUID,
    name        VARCHAR(255) NOT NULL,
    link        VARCHAR(500) NOT NULL,
    icon        VARCHAR(500),
    status      VARCHAR(255) NOT NULL DEFAULT 'active',
    sort_order  INT NOT NULL DEFAULT 0,
    portal_id   UUID
);

CREATE INDEX IF NOT EXISTS idx_social_media_status ON social_media (status);
CREATE INDEX IF NOT EXISTS idx_social_media_portal_id ON social_media (portal_id);
