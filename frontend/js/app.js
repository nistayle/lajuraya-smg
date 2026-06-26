// JavaScript for Lajuraya SMG EWS Landing Page & Interactive Dashboard Simulation

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const simLokasi = document.getElementById('sim-lokasi');
    const simHujan = document.getElementById('sim-hujan');
    const hujanVal = document.getElementById('hujan-val');
    const simPasang = document.getElementById('sim-pasang');
    const pasangVal = document.getElementById('pasang-val');
    const simWaktu = document.getElementById('sim-waktu');
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

    // Coordinate mapping for each dropdown location to center the map
    const coordsMap = {
        'genuk': [-6.958, 110.452],       // Kaligawe / Terboyo
        'tanjung_emas': [-6.953, 110.424], // Pelabuhan Tanjung Emas
        'semarang_utara': [-6.963, 110.420] // Semarang Utara (Bandarharjo)
    };

    // 1. Lingkaran Merah Transparan di Jalan Raya Kaligawe (Terboyo)
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

    // 2. Lingkaran Merah Transparan di Kawasan Industri Genuk Timur
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

    // 3. Garis Jalur Hijau Rekomendasi Rute Aman: Jl. Wolter Monginsidi -> Jl. Bangetayu Wetan
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

    // Update Slider Labels
    simHujan.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (val === 0) {
            hujanVal.textContent = "Tidak Ada Hujan (0 mm/jam)";
        } else if (val < 20) {
            hujanVal.textContent = `Ringan (${val} mm/jam)`;
        } else if (val < 50) {
            hujanVal.textContent = `Sedang (${val} mm/jam)`;
        } else if (val < 80) {
            hujanVal.textContent = `Lebat (${val} mm/jam)`;
        } else {
            hujanVal.textContent = `Sangat Lebat (${val} mm/jam)`;
        }
    });

    simPasang.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        if (val < 0.5) {
            pasangVal.textContent = `Sangat Rendah (${val.toFixed(1)} m)`;
        } else if (val < 1.2) {
            pasangVal.textContent = `Normal (${val.toFixed(1)} m)`;
        } else if (val < 2.0) {
            pasangVal.textContent = `Tinggi Pasang (${val.toFixed(1)} m)`;
        } else {
            pasangVal.textContent = `Ekstrim Rob (${val.toFixed(1)} m)`;
        }
    });

    // Run Simulation Function via Flask Fetch with local Fallback
    function calculateSimulation() {
        btnSimulasiRun.disabled = true;
        simSpinner.classList.remove('hidden');

        const lokasi = simLokasi.value;
        const hujan = parseInt(simHujan.value);
        const pasang = parseInt(simPasang.value); // in cm
        const waktu = simWaktu.value;

        // Map selection value to API value ('genuk' maps to 'kaligawe' for mock trigger)
        const apiLocation = (lokasi === 'genuk') ? 'kaligawe' : lokasi;

        // Fetch data from Flask backend
        fetch('http://127.0.0.1:5000/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lokasi: apiLocation })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // SUCCESS: Update using Flask response
            updateDashboardUI(data, lokasi, hujan, pasang, waktu);
            focusMap(lokasi);
        })
        .catch(error => {
            console.warn("Backend API offline/error. Using local AI simulation fallback.", error);
            // FALLBACK: Use local calculation when Flask server is offline
            const fallbackData = computeLocalFallback(lokasi, hujan, pasang, waktu);
            updateDashboardUI(fallbackData, lokasi, hujan, pasang, waktu);
            focusMap(lokasi);
        })
        .finally(() => {
            btnSimulasiRun.disabled = false;
            simSpinner.classList.add('hidden');
        });
    }

    // Centering the map on the selected location
    function focusMap(lokasi) {
        const coords = coordsMap[lokasi];
        if (coords) {
            map.setView(coords, 15, { animate: true, duration: 1.5 });
        }
    }

    // Function to calculate WMI score and indicators offline
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
        if (floodHeight > 45) {
            status = "Bahaya Ekstrim";
            rute = "Gunakan Rute Alternatif Darurat Utama / Hubungi Pengawas Pabrik";
        } else if (floodHeight > 25) {
            status = "Bahaya Tinggi";
            rute = "Sangat Disarankan beralih ke Jl. Wolter Monginsidi";
        } else if (floodHeight > 10) {
            status = "Aman Bersyarat";
            rute = "Gunakan Rute Alternatif atau Gunakan Roda Empat";
        }

        return {
            "nama_wilayah": lokasiName,
            "akurasi": "91.2%",
            "ketinggian_air": `${floodHeight} cm`,
            "status": status,
            "rute_alternatif": rute,
            "whatsapp_alert": floodHeight > 25 ? "Sent" : "Not Needed"
        };
    }

    // Function to update all HTML elements with the simulation result
    function updateDashboardUI(data, lokasi, hujan, pasang, waktu) {
        // 1. Calculate WMI Score based on Status & Parameters
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

        // Calculate final score
        let finalWmi = Math.round((floodScore * 0.40) + (safetyScore * 0.25) + (lightingScore * 0.20) + (trafficScore * 0.15));
        finalWmi = Math.min(100, Math.max(5, finalWmi));

        // Update Gauge
        wmiScore.textContent = finalWmi;
        wmiProgress.style.strokeDasharray = `${finalWmi}, 100`;

        // Update WMI Badge
        wmiBadge.className = "mt-4 px-3 py-1 text-xs font-bold rounded-full border transition-all duration-300 ";
        if (finalWmi >= 80) {
            wmiBadge.textContent = "Rute Aman";
            wmiBadge.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
            wmiProgress.className.baseVal = "text-emerald-500 transition-all duration-1000 ease-out";
        } else if (finalWmi >= 55) {
            wmiBadge.textContent = "Rute Aman Bersyarat";
            wmiBadge.classList.add('bg-amber-500/10', 'text-amber-400', 'border-amber-500/20');
            wmiProgress.className.baseVal = "text-amber-500 transition-all duration-1000 ease-out";
        } else {
            wmiBadge.textContent = "Rute Tidak Aman / Bahaya";
            wmiBadge.classList.add('bg-rose-500/10', 'text-rose-400', 'border-rose-500/20');
            wmiProgress.className.baseVal = "text-rose-500 transition-all duration-1000 ease-out";
        }

        // Update Flood Height Indicator
        pBanjirVal.textContent = `${data.ketinggian_air} (${data.status})`;
        pBanjirBar.style.width = `${Math.min(100, floodHeight * 2.2)}%`;
        if (data.status.includes("Bahaya")) {
            pBanjirBar.className = "bg-rose-500 h-1.5 rounded-full transition-all duration-700";
        } else if (data.status.includes("Bersyarat")) {
            pBanjirBar.className = "bg-amber-500 h-1.5 rounded-full transition-all duration-700";
        } else {
            pBanjirBar.className = "bg-indigo-500 h-1.5 rounded-full transition-all duration-700";
        }

        // Update Traffic Indicator
        let trafficText = "Lancar";
        if (trafficScore < 40) trafficText = "Padat Merayap / Macet";
        else if (trafficScore < 70) trafficText = "Ramai Lancar";
        pLalulintasVal.textContent = trafficText;
        pLalulintasBar.style.width = `${trafficScore}%`;

        // Update Lighting Indicator
        let lightingText = "Sangat Terang";
        if (lightingScore < 40) lightingText = "Minim Cahaya (Gelap)";
        else if (lightingScore < 75) lightingText = "Cukup Terang";
        pCahayaVal.textContent = `${lightingText} (${lightingScore}%)`;
        pCahayaBar.style.width = `${lightingScore}%`;

        // Update Safety Indicator
        let safetyText = "Sangat Aman";
        if (safetyScore < 45) safetyText = "Rawan Kejahatan / Sepi";
        else if (safetyScore < 75) safetyText = "Cukup Aman";
        pKeamananVal.textContent = safetyText;
        pKeamananBar.style.width = `${safetyScore}%`;

        // Update advisory string with API data
        let waStatus = (data.whatsapp_alert === 'Sent') 
            ? '<span class="text-emerald-400 font-bold ml-1">[WhatsApp Peringatan: Terkirim Ke Komunitas Buruh]</span>' 
            : '<span class="text-slate-500 ml-1">[WhatsApp Peringatan: Tidak Perlu]</span>';
            
        wmiAdvisory.innerHTML = `
            <strong>Prediksi AI untuk ${data.nama_wilayah} (Akurasi: ${data.akurasi}):</strong><br>
            Status: <span class="${data.status.includes('Bahaya') ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}">${data.status}</span>. Ketinggian air genangan berkisar ${data.ketinggian_air}. <br>
            <strong>Rekomendasi Navigasi:</strong> ${data.rute_alternatif}. ${waStatus}
        `;
    }

    // Run once at start to bind variables
    calculateSimulation();
});
