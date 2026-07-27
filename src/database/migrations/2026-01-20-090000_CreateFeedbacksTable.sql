-- =====================================================
-- Create feedbacks table
-- PostgreSQL version
-- =====================================================
CREATE TABLE IF NOT EXISTS feedbacks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP,
    deleted_at  TIMESTAMP,
    deleted_by  UUID,
    portal_id   UUID,
    name        VARCHAR(255),
    email       VARCHAR(255),
    message     TEXT NOT NULL,
    rating      INT,
    page_url    VARCHAR(2048),
    ip_address  VARCHAR(64),
    user_agent  VARCHAR(512)
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_portal_id ON feedbacks (portal_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks (created_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON feedbacks (rating);
