<?php

namespace JrAccessibility\Data;

interface DatabaseHandler
{
    public function query(string $sql, array $params = []): array;
    // ...
}

class QuickLinkService
{
    private DatabaseHandler $db;

    public function __construct(DatabaseHandler $db)
    {
        $this->db = $db;
    }

    public function getActiveQuickLinks(?string $portalId = null): array
    {
        $sql = "SELECT name, link, description, icon, is_external FROM quick_links WHERE status = 'active' AND deleted_at IS NULL";
        $params = [];

        if ($portalId) {
            $sql .= " AND portal_id = ?";
            $params[] = $portalId;
        }
        $sql .= " ORDER BY sort_order DESC";

        return $this->db->query($sql, $params);
    }
}