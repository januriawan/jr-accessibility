![jr-accessibility Demo](demo/demo.jpg)

# jr-accessibility

Widget aksesibilitas **framework-agnostic** — bisa dipasang di project PHP apa pun, atau bahkan HTML statis tanpa backend sama sekali.

Modul ini menyediakan:
- **Accessibility Menu** (drawer) — voice mode, ukuran teks, line height, spacing, alignment, bold, reading guide, monochrome, high contrast, large cursor, magnifier, pause animations, hide images, virtual keyboard
- **Floating Sidebar** (desktop) — tombol akses cepat
- **Floating Panels** — drawer untuk Quick Access dan Social Media
- **Mobile FAB** — floating action button untuk mobile
- **Feedback Modal** — form feedback dengan rating emoji + captcha (opsional, butuh backend)

---

## Struktur Folder

```
jr-accessibility/
├── README.md                          ← File ini
├── demo/
│   └── floating.html                  ← Demo pure HTML, buka di browser langsung jalan
├── src/
│   ├── php/
│   │   ├── core/
│   │   │   └── utils.php              ← Helper (sstc_social_brand, sstc_social_icon_class, sstc_quick_link_icon_class)
│   │   └── data/
│   │       ├── FeedbackService.php    ← Logika simpan feedback (butuh DBHandler)
│   │       ├── QuickLinkService.php   ← Ambil quick links dari DB
│   │       └── SocialMediaService.php ← Ambil social media dari DB
│   └── database/
│       └── migrations/
│           ├── 2025-08-23-130000_CreateSocialMediaTable.sql
│           ├── 2025-08-23-200000_CreateQuickLinksTable.sql
│           ├── 2025-09-01-000000_AddIconToQuickLinksTable.sql
│           └── 2026-01-20-090000_CreateFeedbacksTable.sql
└── public/
    └── assets/
        └── jr-accessibility/
            ├── css/
            │   └── style.css          ← Semua CSS (aksesibilitas + floating + fab + modal)
            ├── js/
            │   └── script.js          ← Semua JS (engine + panel + fab + feedback)
            └── cursor/
                └── big-cursor.png     ← Gambar cursor untuk "Enlarge Cursor"
```

---

## Cara Pakai — 2 Mode

### Mode A: Pure HTML (Tanpa Backend)

Untuk situs HTML statis, blog, atau project tanpa PHP.

#### Langkah 1: Copy Assets

Copy folder `public/assets/jr-accessibility/` ke folder assets project kamu:

```
your-project/
├── index.html
└── assets/
    └── jr-accessibility/     ← copy ke sini
        ├── css/style.css
        ├── js/script.js
        └── cursor/big-cursor.png
```

#### Langkah 2: Tambah CSS & JS ke HTML

Di file HTML kamu, tambahkan di `<head>` dan sebelum `</body>`:

```html
<head>
    <!-- Bootstrap Icons (wajib) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

    <!-- jr-accessibility CSS -->
    <link rel="stylesheet" href="assets/jr-accessibility/css/style.css">
</head>

<body>
    <!-- ... konten kamu ... -->

    <!-- Bootstrap JS (opsional, hanya jika pakai feedback modal) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

    <!-- ResponsiveVoice.js (opsional, hanya jika pakai Voice Mode) -->
    <script src="https://code.responsivevoice.org/responsivevoice.js"></script>

    <!-- jr-accessibility JS -->
    <script src="assets/jr-accessibility/js/script.js"></script>
</body>
```

#### Langkah 3: Copy Widget HTML

Copy blok HTML widget dari file `demo/floating.html` (bagian mulai dari `<div class="sstc-reading-guide">` sampai sebelum `<!-- Scripts -->`) ke dalam `<body>` kamu.

Wrap konten utama kamu dengan `<div class="sstc-page-root">...</div>` agar fitur seperti high contrast dan hide images bekerja dengan benar.

#### Langkah 4: Test

Buka `demo/floating.html` langsung di browser untuk lihat demo lengkap.

---

### Mode B: PHP / Framework (CodeIgniter 4, Laravel, Native PHP, dll.)

Untuk project PHP yang punya backend dan database.

#### Langkah 1: Copy Assets

Sama seperti Mode A — copy `public/assets/jr-accessibility/` ke folder public project.

#### Langkah 2: Jalankan Database Migration

Jalankan SQL dari `src/database/migrations/` di database kamu. File tersedia dalam format `.sql` (PostgreSQL).

Tabel yang dibuat:
- `feedbacks` — menyimpan feedback dari user
- `social_media` — daftar social media links
- `quick_links` — daftar quick access links

> Jika pakai MySQL/SQLite, sesuaikan tipe `UUID` ke `CHAR(36)` atau `VARCHAR(36)`.

#### Langkah 3: Include PHP Services

Copy folder `src/php/` ke project kamu, lalu autoload dengan composer atau manual `require_once`.

Contoh integrasi dengan database (PDO):

```php
<?php
// Implementasi DatabaseHandler dengan PDO
class PdoDatabaseHandler implements JrAccessibility\Data\DatabaseHandler
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function insert(string $table, array $data): string|bool
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $stmt = $this->pdo->prepare("INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})");
        $stmt->execute(array_values($data));
        return $data['id']; // return UUID
    }

    public function query(string $sql, array $params = []): array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

// Inisialisasi
$pdo = new PDO('pgsql:host=localhost;dbname=myapp', 'user', 'pass');
$db = new PdoDatabaseHandler($pdo);

// Ambil quick links & social media
$quickLinkService = new JrAccessibility\Data\QuickLinkService($db);
$socialMediaService = new JrAccessibility\Data\SocialMediaService($db);

$quickLinks = $quickLinkService->getActiveQuickLinks();
$socialMedia = $socialMediaService->getActiveSocialMedia();

// Simpan feedback
$feedbackService = new JrAccessibility\Data\FeedbackService($db);
$feedbackService->createFeedback([
    'name' => $_POST['name'] ?? '',
    'email' => $_POST['email'] ?? '',
    'message' => $_POST['message'] ?? '',
    'rating' => $_POST['rating'] ?? null,
    'page_url' => $_SERVER['HTTP_REFERER'] ?? '',
    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
]);
```

#### Langkah 4: Render Widget

Di template PHP kamu, render widget dengan data dari service:

```php
<?php require_once __DIR__ . '/src/php/core/utils.php'; ?>

<div class="sstc-page-root">
    <!-- konten utama -->
</div>

<!-- Reading guide & Magnifier -->
<div class="sstc-reading-guide"></div>
<div class="sstc-magnifier" data-acc-ignore-magnifier="1" aria-hidden="true">
    <div class="sstc-magnifier-inner"></div>
</div>

<!-- Floating Sidebar -->
<nav class="floating-right">
    <a class="fl-btn" data-bs-toggle="modal" data-bs-target="#feedbackModal" href="#">
        <i class="bi bi-emoji-smile-fill"></i><span class="label">Give Feedback</span>
    </a>
    <a class="fl-btn social-panel-toggle" data-action="toggleSocialPanel" href="#">
        <i class="bi bi-share-fill"></i><span class="label">Social Media</span>
    </a>
    <a class="fl-btn sstc-clickable" data-action="togglesstcMenu" href="#">
        <i class="bi bi-person-wheelchair"></i><span class="label">Accessibility</span>
    </a>
    <a class="fl-btn quick-access-toggle" data-action="toggleQuickAccess" href="#">
        <i class="bi bi-lightning-charge-fill"></i><span class="label">Quick Access</span>
    </a>
</nav>

<!-- ... copy blok HTML lainnya dari demo/floating.html ... -->
```

---

## Fitur Lengkap

| Fitur | Butuh Backend? | Keterangan |
|---|---|---|
| Text Size | ❌ | 50%–200% |
| Line Height | ❌ | 1.0x–3.0x |
| Text Spacing | ❌ | Small / Medium / Large |
| Text Alignment | ❌ | Left / Center / Right / Justify |
| Bold Text | ❌ | Semua teks bold |
| Reading Guide | ❌ | Garis horizontal mengikuti kursor |
| Monochrome | ❌ | Grayscale filter |
| High Contrast | ❌ | Kontras tinggi |
| Large Cursor | ❌ | Custom cursor image |
| Cursor Magnifier | ❌ | Pembesar 1.75x |
| Pause Animations | ❌ | Matikan animasi & transisi |
| Hide Images | ❌ | Sembunyikan gambar dekoratif |
| Virtual Keyboard | ❌ | Keyboard on-screen |
| Voice Mode | ❌ | ResponsiveVoice TTS |
| Quick Access Panel | ✅ | Data dari tabel `quick_links` |
| Social Media Panel | ✅ | Data dari tabel `social_media` |
| Feedback Modal | ✅ | Submit ke endpoint backend |

> Fitur yang ditandai ❌ bekerja **tanpa backend** — hanya CSS + JS.
> Fitur yang ditandai ✅ butuh backend/database.

---

## Konfigurasi

### Cursor Image

Path cursor ada di CSS (`style.css`), cari `:root`:

```css
:root {
    --sstc-big-cursor: url("/assets/jr-accessibility/cursor/big-cursor.png") 2 2, auto;
    --sstc-big-pointer: url("/assets/jr-accessibility/cursor/big-cursor.png") 2 2, pointer;
}
```

Ganti path sesuai lokasi folder assets di project kamu.

### Feedback Endpoint

Default endpoint yang dipanggil JS:
- `GET  {siteUrl}feedback/captcha` — generate captcha
- `POST {siteUrl}feedback` — submit feedback

Variabel `siteUrl` harus didefinisikan **sebelum** `script.js`:

```html
<script>var siteUrl = "https://example.com/";</script>
<script src="assets/jr-accessibility/js/script.js"></script>
```

Ganti endpoint di `script.js` bagian PART 4 jika berbeda.

### ResponsiveVoice API Key

Jika pakai API key, tambahkan sebelum script ResponsiveVoice:

```html
<script>window.rvApiKey = 'YOUR_API_KEY';</script>
```

---

## Dependency

| Dependency | Wajib? | Kegunaan |
|---|---|---|
| Bootstrap Icons CSS | ✅ Wajib | Ikon untuk semua tombol & menu |
| Bootstrap 5 JS | Opsional | Hanya untuk Feedback Modal |
| ResponsiveVoice.js | Opsional | Hanya untuk Voice Mode (TTS) |

CDN links:
```html
<!-- Bootstrap Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

<!-- Bootstrap 5 (opsional) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<!-- ResponsiveVoice (opsional) -->
<script src="https://code.responsivevoice.org/responsivevoice.js"></script>
```

---

## Skema Database

### Tabel `feedbacks`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(255) | Nama pengirim (nullable) |
| email | VARCHAR(255) | Email pengirim (nullable) |
| message | TEXT | Isi feedback (wajib) |
| rating | INT | Rating 1–5 (nullable) |
| page_url | VARCHAR(2048) | URL halaman saat submit |
| ip_address | VARCHAR(64) | IP pengirim |
| user_agent | VARCHAR(512) | Browser/OS pengirim |
| portal_id | UUID | ID portal (opsional) |
| created_at | TIMESTAMP | Tanggal dibuat |

### Tabel `social_media`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(255) | Nama platform |
| link | VARCHAR(500) | URL |
| icon | VARCHAR(500) | URL gambar icon (opsional) |
| status | VARCHAR(255) | `active` / `inactive` |
| sort_order | INT | Urutan tampil |
| portal_id | UUID | ID portal (opsional) |

### Tabel `quick_links`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(255) | Nama link |
| link | VARCHAR(500) | URL atau path internal |
| description | TEXT | Deskripsi (opsional) |
| icon | VARCHAR(255) | Class Bootstrap Icons (opsional) |
| status | VARCHAR(255) | `active` / `inactive` |
| sort_order | INT | Urutan tampil |
| is_external | BOOLEAN | Link eksternal? |
| portal_id | UUID | ID portal (opsional) |

---

## Lisensi

Free to use. Modify sesuai kebutuhan project.
