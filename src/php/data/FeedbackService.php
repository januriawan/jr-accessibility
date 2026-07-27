<?php

namespace JrAccessibility\Data;

// Ini adalah placeholder untuk antarmuka database.
// Di aplikasi riil, Anda akan mengganti ini dengan ORM atau DBLayer Anda.
interface DatabaseHandler
{
    public function insert(string $table, array $data): string|bool;
    // ... mungkin ada metode lain seperti query, update, delete
}

class FeedbackService
{
    private DatabaseHandler $db;

    public function __construct(DatabaseHandler $db)
    {
        $this->db = $db;
    }

    public function createFeedback(array $data): string|bool
    {
        $name = trim((string)($data['name'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $message = trim((string)($data['message'] ?? ''));
        $rating = filter_var($data['rating'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
        $pageUrl = trim((string)($data['page_url'] ?? ''));
        $ipAddress = trim((string)($data['ip_address'] ?? '')); // Asumsi sudah divalidasi/diperoleh di level controller
        $userAgent = trim((string)($data['user_agent'] ?? '')); // Asumsi sudah divalidasi/diperoleh di level controller
        $portalId = trim((string)($data['portal_id'] ?? '')); // Opsional, jika sistem memiliki konsep portal

        // Validasi
        if ($message === '') {
            throw new \InvalidArgumentException('Message is required.');
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Email must be valid.');
        }
        if ($name !== '' && (strlen($name) < 2 || strlen($name) > 255)) {
            throw new \InvalidArgumentException('Name must be between 2 and 255 characters.');
        }
        if ($pageUrl !== '' && strlen($pageUrl) > 2048) {
            $pageUrl = substr($pageUrl, 0, 2048);
        }
        
        // Generate UUID (asumsi fungsi UUID_V4() tersedia di DB atau pakai library)
        $id = $this->generateUuid(); // Contoh, sesuaikan dengan cara Anda generate UUID

        $insertData = [
            'id' => $id,
            'name' => $name ?: null,
            'email' => $email ?: null,
            'message' => $message,
            'rating' => $rating === false ? null : $rating,
            'page_url' => $pageUrl ?: null,
            'ip_address' => $ipAddress ?: null,
            'user_agent' => $userAgent ?: null,
            'portal_id' => $portalId ?: null,
            'created_at' => date('Y-m-d H:i:s'),
        ];

        return $this->db->insert('feedbacks', $insertData);
    }

    // Fungsi placeholder untuk generate UUID.
    // Di CI4 bisa pakai Ramsey\Uuid\Uuid::uuid4()->toString();
    // Di aplikasi lain bisa pakai fungsi DB atau library lain.
    private function generateUuid(): string
    {
        // Contoh sederhana, di produksi gunakan library UUID yang kuat
        return sprintf( '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ),
            mt_rand( 0, 0xffff ),
            mt_rand( 0, 0x0fff ) | 0x4000,
            mt_rand( 0, 0x3fff ) | 0x8000,
            mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff )
        );
    }
}
