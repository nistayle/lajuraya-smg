# 🗺️ LajuRaya SMG: Early Warning System Banjir Rob Berbasis Web

LajuRaya SMG adalah aplikasi prototipe dashboard berbasis web yang dirancang khusus sebagai sistem peringatan dini (*Early Warning System*) banjir rob di kawasan industri Semarang (seperti Kaligawe dan Genuk). Proyek ini dikembangkan khusus untuk memfasilitasi manajemen risiko mobilitas dan keselamatan para pekerja, terutama **pekerja perempuan** yang terikat sistem *shift* kerja.

Proyek ini diajukan sebagai pemenuhan **Tugas Akhir Basic Kelas** atas dukungan program kemitraan resmi:
* **Perempuan Inovasi**
* **IBM SkillsBuild**
* **Skilvul**

---

## 🚀 Fitur Utama
1. **Peta Interaktif (Leaflet.js):** Visualisasi peta digital yang otomatis fokus mendeteksi titik koordinat rawan banjir rob berdasarkan lokasi yang dipilih.
2. **Simulasi Prediksi Berjangka 12 Jam:** Menyajikan tabel linimasa estimasi pasang surut ketinggian air selama 12 jam ke depan untuk membantu pekerja mengambil keputusan rute perjalanan lebih awal.
3. **Automated Data Architecture Ready:** Backend yang siap dikembangkan untuk integrasi API otomatis (seperti BMKG) di masa depan.

---

## 🛠️ Struktur Folder Proyek
* `backend/` : Berisi server utama Python (`app.py`) menggunakan Framework Flask sebagai pengolah simulasi data tren 12 jam.
* `frontend/` : Berisi komponen antarmuka pengguna (`index.html`, Tailwind CSS, dan JavaScript `app.js` untuk integrasi API dan peta Leaflet).

---

## 💻 Cara Menjalankan Proyek Secara Lokal

1. **Jalankan Backend Flask:**
   Masuk ke folder proyek, aktifkan virtual environment kamu, lalu jalankan:
   ```bash
   python backend/app.py
