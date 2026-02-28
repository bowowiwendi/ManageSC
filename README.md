# 🖥️ Manajemen Penyewaan VPS

Aplikasi CRUD modern untuk manajemen penyewaan VPS dengan tampilan mobile-friendly dan fitur keamanan PIN.

## ✨ Fitur Utama

### 🔐 Keamanan PIN
- **PIN 6 Digit** hanya sekali saat masuk aplikasi
- **PIN tersimpan di PropertiesService** Google Apps Script
- **Setup/Update PIN** melalui menu di Apps Script Editor
- PIN default: `123456`
- Verifikasi PIN dilakukan di server (aman)
- **Tidak perlu PIN berulang kali** - cukup sekali per sesi
- **Desktop & Mobile** - Navigation tersedia di semua device

### 🛠️ Setup PIN Baru
1. Buka Apps Script Editor
2. Jalankan fungsi `setupPin()`
3. Masukkan PIN 6 digit baru
4. PIN tersimpan aman di PropertiesService

### 🔍 Pencarian & Filter
- Pencarian real-time berdasarkan **Username** atau **IP VPS**
- Filter berdasarkan rentang tanggal
- Pagination (10 data per halaman)

### 📱 Mobile-Friendly
- **Bottom Navigation** seperti aplikasi Android
- Responsive design untuk semua ukuran layar
- Touch-friendly buttons dan inputs

### 📧 Notifikasi Otomatis
- Email peringatan 7 hari sebelum kedaluwarsa
- Email notifikasi saat akun kadaluarsa
- Laporan harian ke admin

### 🔄 Integrasi GitHub
- Auto-sync data VPS ke GitHub repository
- Format: `### username expiry_date ip_address`

## 🚀 Cara Deploy

### 1. Google Apps Script
1. Buka [Google Sheets](https://sheets.google.com)
2. Buat spreadsheet baru dengan nama "Manajemen VPS"
3. Buat sheet bernama `DataVPS` dengan kolom:
   - A: ID
   - B: Username
   - C: Tipe Akun
   - D: Masa Aktif
   - E: IP VPS
   - F: Email Member
   - G: RAM
   - H: Pesan

### 2. Setup Apps Script
1. Klik **Extensions** > **Apps Script**
2. Hapus semua kode default
3. Copy-paste kode dari `Code.gs`
4. Buat file baru `Index.hml`
5. Copy-paste kode dari `Index.hml`
6. Simpan project

### 3. Deploy
1. Klik **Deploy** > **New Deployment**
2. Pilih type **Web App**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Klik **Deploy**
6. Copy URL web app

### 4. Setup GitHub (Opsional)
1. Jalankan fungsi `setupGithubToken()` dari Apps Script editor
2. Masukkan GitHub Personal Access Token (PAT)
3. Update konfigurasi di `Code.gs`:
   ```javascript
   const GITHUB_USERNAME = 'your-username';
   const REPO_NAME = 'your-repo';
   const FILE_PATH = 'path/to/file';
   ```

### 5. Setup Trigger Harian (Opsional)
1. Buka Apps Script editor
2. Klik **Triggers** (icon jam)
3. Add Trigger:
   - Function: `runDailyChecks`
   - Event source: `Time-driven`
   - Type: `Day timer`
   - Time: `8am to 9am`

## 🎨 Struktur File

```
ManageSC/
├── Code.gs          # Backend (Google Apps Script)
├── Index.hml        # Frontend (HTML + CSS + JavaScript)
└── README.md        # Dokumentasi
```

## 🔧 Konfigurasi

### Mengubah PIN
**Cara 1: Melalui Apps Script Editor (Recommended)**
1. Buka Apps Script editor
2. Jalankan fungsi `setupPin()`
3. Masukkan PIN 6 digit baru
4. PIN tersimpan di PropertiesService

**Cara 2: Hardcode (Tidak Direkomendasikan)**
Edit di `Code.gs`:
```javascript
const DEFAULT_PIN = '123456'; // Ganti dengan PIN baru
```

### Mengubah Pagination Limit
Edit di `Index.hml`:
```javascript
const PAGE_LIMIT = 10; // Ganti jumlah data per halaman
```

### Mengubah Tema Warna
Edit di `Index.hml` (CSS Variables):
```css
:root {
  --primary-color: #4f46e5;
  --success-color: #10b981;
  --danger-color: #ef4444;
  /* dst... */
}
```

## 📱 Navigation

### Desktop (Top Navigation)
- 🏠 **Home** - Scroll ke atas
- ➕ **Tambah** - Tambah data baru
- 🔍 **Cari** - Fokus ke search bar
- 📢 **Broadcast** - Kirim broadcast
- 📧 **Cek** - Cek kadaluarsa

### Mobile (Bottom Navigation)
- 🏠 **Home** - Scroll ke atas
- ➕ **Tambah** - Tambah data baru
- 🔍 **Cari** - Fokus ke search bar
- 📢 **Broadcast** - Kirim broadcast
- 📧 **Cek** - Cek kadaluarsa

**Note:** PIN hanya diminta **sekali saat pertama kali membuka aplikasi**. Setelah itu bisa akses semua fitur tanpa PIN lagi (dalam sesi yang sama).

## 🎯 Fungsi Backend

| Fungsi | Deskripsi |
|--------|-----------|
| `getStoredPin()` | Mendapatkan PIN dari PropertiesService |
| `setupPin()` | Setup/update PIN melalui UI |
| `verifyPin()` | Verifikasi PIN dari client |
| `getDataImproved()` | Ambil data dengan pagination & filter |
| `addData()` | Tambah data baru |
| `updateData()` | Update data existing |
| `deleteData()` | Hapus data |
| `renewData()` | Perpanjang masa aktif |
| `sendBroadcastToAll()` | Kirim broadcast email |
| `runDailyChecks()` | Cek & notifikasi kadaluarsa |
| `generateVpsListFile()` | Sync data ke GitHub |

## 🛠️ Troubleshooting

### Data tidak muncul
- Pastikan sheet bernama `DataVPS`
- Cek nama kolom sesuai
- Refresh browser

### PIN Modal Tidak Muncul Saat Buka Aplikasi
- Refresh halaman (Ctrl+F5 / Cmd+Shift+R)
- Clear browser cache
- Cek console browser untuk error

### PIN Tidak Berfungsi
- Jalankan `setupPin()` untuk reset PIN
- Pastikan koneksi internet stabil
- Clear browser cache
- Default PIN: `123456`

### Tidak Bisa Close PIN Modal
- PIN modal tidak bisa di-close saat pertama kali buka aplikasi (wajib input PIN)
- Setelah masuk, modal bisa di-close dengan klik tombol Batal atau klik di luar modal

### GitHub Sync Error
- Pastikan token valid
- Cek repo permissions
- Verifikasi file path

## 📝 License

Free to use and modify.

## 👨‍💻 Author

Developed for VPS rental management.

---
**Version:** 4.0 - PIN Once & Desktop Navigation  
**Last Updated:** 2026  
**Changelog:**
- ✅ PIN hanya sekali saat masuk aplikasi (session-based)
- ✅ Navigation tersedia untuk Desktop (Top) & Mobile (Bottom)
- ✅ PIN modal tidak bisa di-close saat app entry
- ✅ Auto-load data setelah PIN benar
- ✅ UX lebih baik - tidak perlu PIN berulang kali
