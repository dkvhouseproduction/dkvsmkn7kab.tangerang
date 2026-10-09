# Website DKV SMKN 7 Kabupaten Tangerang

Website responsif dengan halaman profil, kegiatan, galeri foto/video, login admin, dashboard, status draft/publikasi, dan pengelolaan akun admin/editor menggunakan Supabase.

## File dalam paket
- `index.html` — tampilan publik dan dashboard admin.
- `styles.css` — desain responsif.
- `app.js` — galeri, login, upload, dan pengelolaan konten.
- `config.js` — konfigurasi URL dan anon/public key Supabase.
- `supabase-setup.sql` — tabel, role, kebijakan akses, dan bucket media.

## A. Buat backend gratis
1. Buat akun di https://supabase.com lalu buat project baru. Simpan password database di tempat aman.
2. Di project, buka **SQL Editor** > **New query**. Buka file `supabase-setup.sql`, salin seluruh isinya, tempel ke editor, lalu klik **Run**.
3. Buka **Project Settings > API**. Salin **Project URL** dan **anon/public key**. Jangan pernah menggunakan `service_role` atau secret key di website.
4. Buka `config.js` dengan Notepad atau VS Code. Ganti nilai `SUPABASE_URL` dan `SUPABASE_ANON_KEY`, simpan file.

## B. Buat admin pertama
1. Di Supabase buka **Authentication > Users > Add user** dan buat akun menggunakan email kamu.
2. Buka **SQL Editor** dan jalankan query ini, ganti email contoh dengan email akunmu:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email = 'haidar@admindkv.sch.id';
```

3. Untuk anggota tim media, buat akun terpisah di Authentication > Users lalu jalankan query serupa dengan `role = 'editor'`. Jangan mengaktifkan pendaftaran publik tanpa kebutuhan.

## C. Jalankan di laptop
Cara mudah: pasang Python jika belum tersedia, buka Command Prompt di folder yang berisi file website, lalu jalankan:

```bash
python -m http.server 8000
```

Jika perintah itu tidak dikenali, coba `py -m http.server 8000`. Buka `http://localhost:8000` di browser. Alternatif: gunakan VS Code dengan ekstensi Live Server.

## D. Terbitkan gratis
1. Setelah konfigurasi dan tes lokal, buat akun di https://www.netlify.com.
2. Unggah folder website (berisi `index.html`, `styles.css`, `app.js`, dan `config.js`) lewat fitur deploy manual/drag-and-drop Netlify.
3. Netlify akan memberi subdomain `*.netlify.app`.
4. Di Supabase buka **Authentication > URL Configuration**, set **Site URL** ke URL Netlify dan tambahkan URL itu ke **Redirect URLs**.
5. Tes login, upload, publikasi, dan akses dari HP.

## Keamanan
- Jangan memasukkan service_role/secret key ke `config.js`.
- Akun baru otomatis berperan `viewer`; ubah hanya akun tepercaya menjadi `admin` atau `editor` menggunakan query di atas.
- Foto/video di bucket publik dapat dilihat oleh siapa pun yang memiliki URL. Dapatkan izin sebelum menerbitkan foto siswa.
- Untuk kanal resmi sekolah, minta persetujuan pihak sekolah. Kuota gratis Supabase/Netlify dapat berubah sesuai kebijakan penyedia.

Website belum online otomatis; backend harus dibuat dan konfigurasi harus diisi sebelum login dan unggahan bekerja.
