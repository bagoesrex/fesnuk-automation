# Setup Panduan 4G Mobile Proxy Menggunakan Android

Panduan lengkap mengubah smartphone Android menjadi **4G/5G Mobile Proxy pribadi** untuk automasi Facebook tanpa biaya langganan proxy bulanan.

---

## Kenapa Harus Mobile Proxy?

1. **Skor Kepercayaan Tertinggi (Residential/Mobile)**: Facebook menganggap koneksi dari IP operator seluler (Telkomsel, Indosat, XL, Smartfren, dll.) sebagai pengguna HP asli.
2. **Teknologi CGNAT**: Ribuan pengguna HP berbagi IP publik yang sama. Facebook tidak bisa sembarangan memblokir subnet IP seluler tanpa memblokir ribuan pengguna sah lainnya.
3. **Rotasi IP Tanpa Batas**: Cukup nyalakan lalu matikan Mode Pesawat (*Airplane Mode*), operator akan otomatis memberikan IP publik baru.

---

## Arsitektur Koneksi (Android ⇄ VPS)

```
[VPS Linux (Backend)] 
        │ (Koneksi Tunnel VPN Terenkripsi via Tailscale)
        ▼
[Android 4G/5G Phone] ── (Every Proxy Port 8080) ──> [Internet / Facebook]
```

- **Tailscale**: Menghubungkan VPS dan Android ke dalam satu jaringan privat yang aman tanpa perlu port forwarding atau IP publik statis di HP.
- **Every Proxy**: Aplikasi di Android yang meneruskan request dari VPS ke jaringan data seluler HP.

---

## Alat & Aplikasi yang Dibutuhkan

1. **Smartphone Android** (versi 8.0+) dengan kartu SIM kuota aktif.
2. **Aplikasi Android** (download gratis di Google Play Store):
   - [Tailscale](https://play.google.com/store/apps/details?id=com.tailscale.ipn)
   - [Every Proxy](https://play.google.com/store/apps/details?id=com.gorillasoftware.everyproxy)
3. **Akun Tailscale** (gratis di [tailscale.com](https://tailscale.com)).

---

## Langkah 1: Setup Tailscale di Android & VPS

Tailscale memberikan IP privat statis (contoh: `100.x.y.z`) ke HP dan VPS Anda.

### A. Di Smartphone Android:
1. Buka aplikasi **Tailscale** dan login dengan akun Anda (Google/GitHub/Email).
2. Geser tombol koneksi ke **Connect** / Aktif.
3. Catat alamat IP Tailscale HP Anda (biasanya berawalan `100.xxx.xxx.xxx`).

### B. Di Server VPS:
1. Install Tailscale di VPS (contoh untuk Ubuntu/Debian):
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
2. Klik link yang muncul di terminal untuk login ke akun Tailscale yang sama.
3. Tes koneksi dari VPS ke HP Anda:
   ```bash
   ping 100.xxx.xxx.xxx   # ganti dengan IP Tailscale Android Anda
   ```

---

## Langkah 2: Setup Every Proxy di Android

1. Buka aplikasi **Every Proxy**.
2. Masuk ke menu **Settings** (ikon gerigi):
   - Di bagian **IP Address**, pilih alamat IP Tailscale (`100.xxx.xxx.xxx`), atau centang `0.0.0.0` (Listen on all interfaces).
   - Port default biasanya `8080` (HTTP) atau `1080` (SOCKS5).
3. Kembali ke layar utama Every Proxy, aktifkan switch **HTTP** (atau **SOCKS5**).
4. **Wajib - Matikan Battery Optimization**:
   - Masuk ke Pengaturan HP → Aplikasi → Every Proxy & Tailscale → Penggunaan Baterai → Pilih **Tanpa Batas / Unrestricted / Jangan Optimalkan**.
   - Hal ini penting agar proxy tidak otomatis dimatikan oleh sistem Android saat layar HP terkunci.

---

## Langkah 3: Masukkan Proxy ke Dashboard Fesnuk

1. Buka Dashboard Fesnuk Automation.
2. Masuk ke menu **Session**.
3. Di field **Proxy URL**, masukkan format berikut:
   ```text
   http://100.xxx.xxx.xxx:8080
   ```
   *(Ganti `100.xxx.xxx.xxx` dengan IP Tailscale HP Android Anda)*
4. Simpan akun atau jalankan postingan. Seluruh lalu lintas Playwright di VPS kini akan dialirkan lewat koneksi internet seluler HP Anda!

---

## Pertanyaan: Apakah Proxy Bisa Berubah?

### Jawabannya: **Ya dan Tidak (Tergantung Bagian Mana yang Dimaksud)**

Ada 2 jenis alamat IP dalam sistem ini:

| Komponen | Apakah Berubah? | Penjelasan |
|---|---|---|
| **1. Alamat Proxy di Dashboard (`100.x.y.z:8080`)** | **TIDAK BERUBAH (Statis)** | IP Tailscale bersifat permanen untuk perangkat Android Anda. Sekali Anda input di dashboard, **tidak perlu diubah-ubah lagi selamanya**. |
| **2. Alamat IP Publik yang Dilihat Facebook** | **BISA BERUBAH (Dinamis)** | Alamat IP seluler operator Anda. IP inilah yang berotasi setiap kali Anda merestart koneksi data. |

### Kapan IP Publik Seluler Berubah?
1. **Manual**: Saat Anda menyalakan **Airplane Mode** selama 5–10 detik lalu mematikannya kembali. Operator otomatis memberikan IP publik seluler baru.
2. **Otomatis**: Operator seluler secara berkala memperbarui IP koneksi (biasanya tiap beberapa jam atau saat sinyal tower berganti).
3. **Otomasi via Tasker / MacroDroid (Opsional)**: Anda bisa mengatur aplikasi otomasi di Android untuk toggle Airplane Mode setiap 30 menit atau setiap selesai jadwal posting.

---

## Tips Perawatan Mobile Proxy Android

1. **Gunakan HP Cadangan / Khusus**: Disarankan menggunakan HP Android sekunder yang selalu terhubung ke charger agar stabil standby 24/7.
2. **Kunci Aplikasi di Recent Apps**: Buka recent apps, tekan ikon Every Proxy & Tailscale, lalu pilih **Lock / Kunci** agar tidak tertutup otomatis oleh RAM cleaner bawaan HP.
3. **Tes Koneksi Proxy dari VPS**:
   Anda bisa mengecek apakah proxy berjalan dengan menjalankan perintah ini di terminal VPS:
   ```bash
   curl -x http://100.xxx.xxx.xxx:8080 https://api.ipify.org
   ```
   Jika muncul IP seluler operator HP Anda, berarti setup proxy 100% berhasil!
