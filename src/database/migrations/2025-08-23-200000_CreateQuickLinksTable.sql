-- =====================================================
-- Create quick_links table
-- PostgreSQL version
-- =====================================================
CREATE TABLE IF NOT EXISTS quick_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  UUID,
    updated_at  TIMESTAMP,
    updated_by  UUID,
    deleted_at  TIMESTAMP,
    deleted_by  UUID,
    name        VARCHAR(255) NOT NULL,
    link        VARCHAR(500) NOT NULL,
    description TEXT,
    icon        VARCHAR(255),
    status      VARCHAR(255) NOT NULL DEFAULT 'active',
    sort_order  INT NOT NULL DEFAULT 0,
    is_external BOOLEAN NOT NULL DEFAULT TRUE,
    portal_id   UUID
);

CREATE INDEX IF NOT EXISTS idx_quick_links_status ON quick_links (status);
CREATE INDEX IF NOT EXISTS idx_quick_links_portal_id ON quick_links (portal_id);
CREATE INDEX IF NOT EXISTS idx_quick_links_sort_order ON quick_links (sort_order);
