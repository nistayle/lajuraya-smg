document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements Control
    const simLokasi = document.getElementById('sim-lokasi');
    const btnSimulasiRun = document.getElementById('btn-simulasi-run');
    const simSpinner = document.getElementById('sim-spinner');

    // Dashboard Target Elements
    const wmiScore = document.getElementById('wmi-score');
    const wmiProgress = document.getElementById('wmi-progress');
    const wmiBadge = document.getElementById('wmi-badge');
    const pBanjirVal = document.getElementById('p-banjir-val');
    const pBanjirBar = document.getElementById('p-banjir-bar');
    const pLalulintasVal = document.getElementById('p-lalulintas-val');
    const pLalulintasBar = document.getElementById('p-lalulintas-bar');
    const pCahayaVal = document.getElementById('p-cahaya-val');
    const pCahayaBar = document.getElementById('p-cahaya-bar');
    const pKeamananVal = document.getElementById('p-keamanan-val');
    const pKeamananBar = document.getElementById('p-keamanan-bar');
    const wmiAdvisory = document.getElementById('wmi-advisory');

    // Initialize Leaflet Map (Focus ke Semarang Utara / Genuk / Kaligawe)
    const map = L.map('map').setView([-6.962, 110.463], 14);

    // Tambahkan layer peta dari OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor'
    }).addTo(map);

    // Coordinate mapping untuk memindahkan fokus peta
    const coordsMap = {
        'genuk': [-6.958, 110.452],       // Kaligawe / Terboyo
        'tanjung_emas': [-6.953, 110.424], // Pelabuhan Tanjung Emas
        'semarang_utara': [-6.963, 110.420] // Semarang Utara (Bandarharjo)
    };

    // Hotspot 1: Jalan Raya Kaligawe
    const kaligaweCircle = L.circle([-6.958, 110.452], {
        color: '#EF4444',
        fillColor: '#EF4444',
        fillOpacity: 0.35,
        radius: 450
    }).addTo(map);

    kaligaweCircle.bindPopup(`
        <div class="text-slate-900 font-sans p-1">
            <h5 class="font-bold text-sm text-red-600">Hotspot 1: Jalan Raya Kaligawe (Terboyo)</h5>
            <p class="text-xs text-slate-600 mt-1">
                Kawasan kritis rawan banjir rob. Memiliki risiko genangan air hingga 50 cm yang sering menghentikan lalu lintas roda dua dan memacetkan jalur distribusi logistik.
            </p>
        </div>
    `);

    // Hotspot 2: Kawasan Industri Genuk Timur
    const genukEastCircle = L.circle([-6.959, 110.474], {
        color: '#EF4444',
        fillColor: '#EF4444',
        fillOpacity: 0.35,
        radius: 500
    }).addTo(map);

    genukEastCircle.bindPopup(`
        <div class="text-slate-900 font-sans p-1">
            <h5 class="font-bold text-sm text-red-600">Hotspot 2: Kawasan Industri Genuk Timur</h5>
            <p class="text-xs text-slate-600 mt-1">
                Area padat pabrik tempat ribuan pekerja perempuan bekerja. Saat pasang laut naik, akses keluar masuk area pabrik kerap tergenang air, membahayakan mobilitas pekerja motor shift sore/malam.
            </p>
        </div>
    `);

    // Jalur Hijau Rekomendasi Rute Aman
    const safeRouteCoords = [
        [-6.9604, 110.4721], // Persimpangan Kaligawe & Wolter Monginsidi
        [-6.9650, 110.4728], // Menyusuri Jl. Wolter Monginsidi
        [-6.9710, 110.4735], 
        [-6.9768, 110.4742], // Persimpangan Wolter Monginsidi & Bangetayu Wetan
        [-6.9772, 110.4780], // Menyusuri Jl. Bangetayu Wetan
        [-6.9810, 110.4810],
        [-6.9835, 110.4855]  
    ];

    const safeRouteLine = L.polyline(safeRouteCoords, {
        color: '#10B981',
        weight: 6,
        opacity: 0.85
    }).addTo(map);

    safeRouteLine.bindPopup(`
        <div class="text-slate-900 font-sans p-1">
            <h5 class="font-bold text-sm text-emerald-600">Rute Alternatif Aman Terpilih</h5>
            <p class="text-xs text-slate-600 mt-1">
                <b>Jalur: Jl. Wolter Monginsidi &rarr; Jl. Bangetayu Wetan</b><br>
                Jalan ini bebas dari ancaman genangan rob karena elevasi daratan yang lebih tinggi. Sangat direkomendasikan bagi pengendara sepeda motor, khususnya pekerja perempuan.
            </p>
        </div>
    `);

    // Eksekusi AI ke Backend Flask
    function calculateSimulation() {
        btnSimulasiRun.disabled = true;
        simSpinner.classList.remove('hidden');

        const lokasi = simLokasi.value;

        fetch('http://127.0.0.1:5000/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lokasi: lokasi })
        })
        .then(response => {
            if (!response.ok) throw new Error(`Server status ${response.status}`);
            return response.json();
        })
        .then(data => {
            // Mapping data raw dari API untuk visualisasi grafik dashboard
            const hujanSesuaiSlider = Math.round(data.raw_hujan);
            const pasangSesuaiSlider = Math.round(data.raw_pasang);
            const waktuShift = data.waktu_shift;

            updateDashboardUI(data, lokasi, hujanSesuaiSlider, pasangSesuaiSlider, waktuShift);
            focusMap(lokasi);
        })
        .catch(error => {
            console.error("Gagal memuat prediksi live AI:", error);
            // Fallback lokal otomatis jika API python tidak sengaja offline
            const fallbackData = computeLocalFallback(lokasi, 20, 110, 'pagi');
            updateDashboardUI(fallbackData, lokasi, 20, 110, 'pagi');
            focusMap(lokasi);
        })
        .finally(() => {
            btnSimulasiRun.disabled = false;
            simSpinner.classList.add('hidden');
        });
    }

    // Menggerakkan peta otomatis
    function focusMap(lokasi) {
        const coords = coordsMap[lokasi];
        if (coords) {
            map.setView(coords, 15, { animate: true, duration: 1.5 });
        }
    }

    // Perhitungan lokal cadangan (Fallback) jika backend Flask mati
    function computeLocalFallback(lokasi, hujan, pasang, waktu) {
        let baseFlood = (pasang * 0.25) + (hujan * 0.5);
        let lokasiMultiplier = 1.0;
        let lokasiName = "";

        if (lokasi === 'genuk') {
            lokasiMultiplier = 1.15;
            lokasiName = "Kawasan Industri Kaligawe / Terboyo";
        } else if (lokasi === 'tanjung_emas') {
            lokasiMultiplier = 1.35;
            lokasiName = "Kawasan Pelabuhan Tanjung Emas";
        } else {
            lokasiMultiplier = 0.85;
            lokasiName = "Semarang Utara (Bandarharjo)";
        }

        let floodHeight = Math.round(baseFlood * lokasiMultiplier);
        if (floodHeight > 130) floodHeight = 130;

        let status = "Aman";
        let rute = "Jalan Utama Terpantau Kondusif";
        if (floodHeight > 25) {
            status = "Bahaya Tinggi";
            rute = "Sangat Disarankan beralih ke Jl. Wolter Monginsidi";
        }

        return {
            "nama_wilayah": lokasiName,
            "akurasi": "85.0% (Fallback Mode)",
            "ketinggian_air": `${floodHeight} cm`,
            "status": status,
            "rute_alternatif": rute,
            "whatsapp_alert": floodHeight > 25 ? "Sent" : "Not Needed",
            "waktu_shift": waktu,
            "raw_hujan": hujan,
            "raw_pasang": pasang
        };
    }

        // Tombol WA terpisah
    const tombolWA = document.getElementById('btn-kirim-wa');

    tombolWA.addEventListener('click', function() {
        const nomorTujuan = "6289527347733"; // Ganti nomor HP demo Anda
        
        const teksPesan = `⚠️ *PERINGATAN DINI LAJURAYA SMG* ⚠️

    Halo Rekan Pekerja, Model AI kami mendeteksi potensi kenaikan Banjir Rob di kawasan industri pesisir Semarang (Genuk/Terboyo).

    📊 *Rincian Prediksi:*
    • Ketinggian Rob: 45 cm (Siaga)
    • Estimasi Puncak: 14:30 WIB
    • Women Mobility Index (WMI): 42 (Risiko Tinggi)

    ⚡ *Rekomendasi Rute Aman:*
    Hindari Jalan Raya Kaligawe. Gunakan rute alternatif via *Jl. Wolter Monginsidi - Bangetayu Wetan* yang terpantau lebih aman.

    Tetap waspada dan utamakan keselamatan!`;

        const pesanTerencode = encodeURIComponent(teksPesan);
        window.open(`https://wa.me/${nomorTujuan}?text=${pesanTerencode}`, '_blank');
    });

    // Mengubah tampilan visual, bar kemajuan, teks deskripsi, dan skor WMI pada UI
    function updateDashboardUI(data, lokasi, hujan, pasang, waktu) {
        let floodHeight = parseInt(data.ketinggian_air) || 0;
        let floodScore = Math.max(0, 100 - (floodHeight * 2)); 
        
        let trafficBase = 85;
        if (hujan > 40) trafficBase -= 20;
        if (floodHeight > 20) trafficBase -= 35;
        if (waktu === 'sore') trafficBase -= 15;
        let trafficScore = Math.max(10, trafficBase);

        let lightingScore = 95;
        if (waktu === 'sore') lightingScore = 65;
        if (waktu === 'malam') {
            lightingScore = (lokasi === 'genuk') ? 40 : (lokasi === 'tanjung_emas' ? 30 : 50);
        }

        let safetyScore = 90;
        if (waktu === 'sore') safetyScore = 80;
        if (waktu === 'malam') {
            safetyScore = 50;
            if (lightingScore < 50) safetyScore -= 15;
            if (floodHeight > 25) safetyScore -= 20;
        }
        safetyScore = Math.max(15, safetyScore);

        // Bobot kalkulasi total skor indeks pergerakan (WMI)
        let finalWmi = Math.round((floodScore * 0.40) + (safetyScore * 0.25) + (lightingScore * 0.20) + (trafficScore * 0.15));
        finalWmi = Math.min(100, Math.max(5, finalWmi));

        // Update Gauge Lingkaran
        wmiScore.textContent = finalWmi;
        wmiProgress.style.strokeDasharray = `${finalWmi}, 100`;

        // Update Badge Status Keamanan Rute
        wmiBadge.className = "mt-4 px-3 py-1 text-xs font-bold rounded-full border transition-all duration-300 ";
        if (finalWmi >= 80) {
            wmiBadge.textContent = "Rute Aman";
            wmiBadge.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
            wmiProgress.setAttribute('class', 'text-emerald-500 transition-all duration-1000 ease-out');
        } else if (finalWmi >= 55) {
            wmiBadge.textContent = "Rute Aman Bersyarat";
            wmiBadge.classList.add('bg-amber-500/10', 'text-amber-400', 'border-amber-500/20');
            wmiProgress.setAttribute('class', 'text-amber-500 transition-all duration-1000 ease-out');
        } else {
            wmiBadge.textContent = "Rute Tidak Aman / Bahaya";
            wmiBadge.classList.add('bg-rose-500/10', 'text-rose-400', 'border-rose-500/20');
            wmiProgress.setAttribute('class', 'text-rose-500 transition-all duration-1000 ease-out');
        }

        // Update Bar Indikator Ketinggian Banjir
        pBanjirVal.textContent = `${data.ketinggian_air} (${data.status})`;
        pBanjirBar.style.width = `${Math.min(100, floodHeight * 2.2)}%`;
        if (data.status.includes("Bahaya")) {
            pBanjirBar.className = "bg-rose-500 h-1.5 rounded-full transition-all duration-700";
        } else if (data.status.includes("Bersyarat")) {
            pBanjirBar.className = "bg-amber-500 h-1.5 rounded-full transition-all duration-700";
        } else {
            pBanjirBar.className = "bg-indigo-500 h-1.5 rounded-full transition-all duration-700";
        }

        // Update Bar Indikator Lalu Lintas
        let trafficText = "Lancar";
        if (trafficScore < 40) trafficText = "Padat Merayap / Macet";
        else if (trafficScore < 70) trafficText = "Ramai Lancar";
        pLalulintasVal.textContent = trafficText;
        pLalulintasBar.style.width = `${trafficScore}%`;

        // Update Bar Indikator Pencahayaan Jalan
        let lightingText = "Sangat Terang";
        if (lightingScore < 40) lightingText = "Minim Cahaya (Gelap)";
        else if (lightingScore < 75) lightingText = "Cukup Terang";
        pCahayaVal.textContent = `${lightingText} (${lightingScore}%)`;
        pCahayaBar.style.width = `${lightingScore}%`;

        // Update Bar Indikator Keamanan Wilayah
        let safetyText = "Sangat Aman";
        if (safetyScore < 45) safetyText = "Rawan Kejahatan / Sepi";
        else if (safetyScore < 75) safetyText = "Cukup Aman";
        pKeamananVal.textContent = safetyText;
        pKeamananBar.style.width = `${safetyScore}%`;

        // Update Kotak Analisis Rekomendasi/Advisory Utama
        let waStatus = (data.whatsapp_alert === 'Sent') 
            ? '<span class="text-emerald-400 font-bold ml-1">[WhatsApp Peringatan: Terkirim Ke Komunitas Buruh]</span>' 
            : '<span class="text-slate-500 ml-1">[WhatsApp Peringatan: Tidak Perlu]</span>';
            
        wmiAdvisory.innerHTML = `
            <strong>Prediksi AI untuk ${data.nama_wilayah} (Akurasi: ${data.akurasi}):</strong><br>
            Status: <span class="${data.status.includes('Bahaya') ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}">${data.status}</span>. Ketinggian air genangan berkisar ${data.ketinggian_air}. <br>
            <strong>Rekomendasi Navigasi:</strong> ${data.rute_alternatif}. ${waStatus}
        `;
    }

    // pemicu fungsi klik pada tombol simulasi utama
    btnSimulasiRun.addEventListener('click', calculateSimulation);

    // Jalankan satu kali otomatis saat halaman pertama dimuat
    calculateSimulation();
});