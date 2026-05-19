# Perubahan Layout Stat Cards di GuruDashboard

## Tujuan
Mengubah 4 kartu statistik (Total Siswa, Aktif Hari Ini, Rata-rata, Partisipasi) dari layout horizontal (icon + teks sejajar) ke layout vertikal (icon di atas, teks di bawah) agar tidak overflow di mobile.

## Perubahan

### File: `src/pages/GuruDashboard.tsx`

1. **Ganti `CardContent` dengan `div` biasa** — pakai className `p-3 flex flex-col items-center gap-2` supaya konten bertumpuk vertikal dan tetap rapi.

2. **Atur ulang icon dan teks:**
   - Icon wrapper tetap `w-9 h-9 rounded-xl bg-.../10 flex items-center justify-center`
   - Teks wrapper menjadi `text-center` (bukan `min-w-0`)
   - Label dan angka tetap sama

3. **Terapkan ke keempat card:**
   - Total Siswa (icon: Users)
   - Aktif Hari Ini (icon: Activity)
   - Rata-rata (icon: BookOpen)
   - Partisipasi (icon: TrendingUp)

## Hasil akhir visual
Setiap card menampilkan icon bulat berwarna di bagian atas, label kecil di tengah, dan angka besar di bawah — semua rata tengah — tanpa overflow di layar kecil.
