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

    // Initialize Leaflet Map
    const map = L.map('map').setView([-6.962, 110.463], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const coordsMap = {
        'genuk': [-6.958, 110.452],
        'tanjung_emas': [-6.953, 110.424],
        'semarang_utara': [-6.963, 110.420]
    };

    // ==========================================
    // FUNGSI BARU: MENAMPILKAN PENANDA LIVE DARI YOLOv8
    // ==========================================
    function loadCCTVAILive() {
        // Menembak endpoint sub-rute CCTV YOLOv8 kamu
        fetch('http://127.0.0.1:5000/api/predict/cctv')
            .then(response => {
                if (!response.ok) throw new Error("Gagal memuat API CCTV");
                return response.json();
            })
            .then(dataCCTV => {
                dataCCTV.forEach(cctv => {
                    let warnaPenanda = 'green';
                    if (cctv.status_banjir === 'BAHAYA') warnaPenanda = 'red';

                    // Membuat penanda marker otomatis di peta berdasarkan koordinat CCTV
                    let marker = L.marker([cctv.latitude, cctv.longitude]).addTo(map);

                    marker.bindPopup(`
                        <div style="font-family: sans-serif; width: 220px; color: #1e293b;">
                            <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #0f172a;">📹 ${cctv.nama_lokasi}</h4>
                            <p style="margin: 4px 0; font-size: 12px;">Status Deteksi AI: <b style="color: ${warnaPenanda === 'red' ? '#ef4444' : '#10b981'}">${cctv.status_banjir}</b> (${cctv.akurasi_ai * 100}%)</p>
                            <p style="margin: 4px 0; font-size: 12px;">Estimasi Genangan: <b>${cctv.ketinggian_air_cm} cm</b></p>
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0;">
                            <small style="color: #475569; font-size: 11px; display: block; line-height: 1.4;">⚠️ <b>Rekomendasi Matic:</b> ${cctv.rekomendasi_matic}</small>
                        </div>
                    `);
                });
            })
            .catch(error => console.error("Info: API YOLOv8 offline:", error));
    }

    // Eksekusi Dashboard Model ML
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
            updateDashboardUI(data, lokasi, Math.round(data.raw_hujan), Math.round(data.raw_pasang), data.waktu_shift);
            focusMap(lokasi);
        })
        .catch(error => {
            console.error("Gagal memuat prediksi live AI:", error);
            const fallbackData = computeLocalFallback(lokasi, 20, 110, 'pagi');
            updateDashboardUI(fallbackData, lokasi, 20, 110, 'pagi');
            focusMap(lokasi);
        })
        .finally(() => {
            btnSimulasiRun.disabled = false;
            simSpinner.classList.add('hidden');
        });
    }

    function focusMap(lokasi) {
        const coords = coordsMap[lokasi];
        if (coords) map.setView(coords, 15, { animate: true, duration: 1.5 });
    }

    function computeLocalFallback(lokasi, hujan, pasang, waktu) {
        return {
            "nama_wilayah": lokasi === 'genuk' ? "Kawasan Industri Kaligawe / Terboyo" : (lokasi === 'tanjung_emas' ? "Kawasan Pelabuhan Tanjung Emas" : "Semarang Utara (Bandarharjo)"),
            "akurasi": "85.0% (Fallback Mode)",
            "ketinggian_air": "0 cm",
            "status": "Aman",
            "rute_alternatif": "Jalan Utama Terpantau Kondusif",
            "whatsapp_alert": "Not Needed",
            "waktu_shift": waktu,
            "raw_hujan": hujan,
            "raw_pasang": pasang
        };
    }

    function updateDashboardUI(data, lokasi, hujan, pasang, waktu) {
        let floodHeight = parseInt(data.ketinggian_air) || 0;
        let floodScore = Math.max(0, 100 - (floodHeight * 2)); 
        
        let trafficBase = 85;
        if (hujan > 40) trafficBase -= 20;
        if (floodHeight > 20) trafficBase -= 35;
        let trafficScore = Math.max(10, trafficBase);

        let lightingScore = waktu === 'malam' ? ((lokasi === 'genuk') ? 40 : 30) : 95;
        let safetyScore = waktu === 'malam' ? 50 : 90;

        let finalWmi = Math.round((floodScore * 0.40) + (safetyScore * 0.25) + (lightingScore * 0.20) + (trafficScore * 0.15));

        wmiScore.textContent = finalWmi;
        wmiProgress.style.strokeDasharray = `${finalWmi}, 100`;

        wmiBadge.className = "mt-4 px-3 py-1 text-xs font-bold rounded-full border transition-all duration-300 ";
        if (finalWmi >= 80) {
            wmiBadge.textContent = "Rute Aman";
            wmiBadge.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
        } else {
            wmiBadge.textContent = "Rute Tidak Aman / Bahaya";
            wmiBadge.classList.add('bg-rose-500/10', 'text-rose-400', 'border-rose-500/20');
        }

        pBanjirVal.textContent = `${data.ketinggian_air} (${data.status})`;
        pBanjirBar.style.width = `${Math.min(100, floodHeight * 2.2)}%`;

        pLalulintasVal.textContent = trafficScore < 50 ? "Padat / Macet" : "Lancar";
        pLalulintasBar.style.width = `${trafficScore}%`;

        pCahayaVal.textContent = `${lightingScore}%`;
        pCahayaBar.style.width = `${lightingScore}%`;

        pKeamananVal.textContent = safetyScore < 60 ? "Rawan Sepi" : "Sangat Aman";
        pKeamananBar.style.width = `${safetyScore}%`;

        wmiAdvisory.innerHTML = `
            <strong>Prediksi AI untuk ${data.nama_wilayah}:</strong><br>
            Status: <span>${data.status}</span>. Tinggi Air: ${data.ketinggian_air}. <br>
            <strong>Rekomendasi Rute:</strong> ${data.rute_alternatif}.
        `;
    }

    btnSimulasiRun.addEventListener('click', calculateSimulation);
    
    // MENYALAKAN FUNGSI CCTV YOLOv8 DAN SIMULASI AWAL
    loadCCTVAILive();
    calculateSimulation();
});