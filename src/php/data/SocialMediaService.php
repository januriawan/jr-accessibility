<?php

namespace JrAccessibility\Data;

interface DatabaseHandler
{
    public function query(string $sql, array $params = []): array;
    // ...
}

class SocialMediaService
{
    private DatabaseHandler $db;

    public function __construct(DatabaseHandler $db)
    {
        $this->db = $db;
    }

    public function getActiveSocialMedia(?string $portalId = null): array
    {
        $sql = "SELECT name, link, icon FROM social_media WHERE status = 'active' AND deleted_at IS NULL";
        $params = [];

        if ($portalId) {
            $sql .= " AND portal_id = ?";
            $params[] = $portalId;
        }
        $sql .= " ORDER BY sort_order DESC";

        return $this->db->query($sql, $params);
    }
}