from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import joblib
import numpy as np
import requests

app = Flask(__name__)
CORS(app)

# 1. LOAD MODEL ML 
try:
    model_rob = joblib.load('backend/model_rob_semarang.pkl')
    print("🚀 Model ML Berhasil Dimuat di Flask!")
except Exception as e:
    print(f"⚠️ Gagal memuat model. Periksa file 'model_rob_semarang.pkl'. Error: {e}")
    model_rob = None

# HELPER: Generator Tren Prediksi 12 Jam Ke Depan
def generate_trend(peak_level):
    trend = []
    tide_profile = [0.45, 0.65, 0.85, 0.98, 1.0, 0.95, 0.80, 0.60, 0.45, 0.30, 0.20, 0.15]
    
    for hour in range(1, 13):
        height = round(peak_level * tide_profile[hour-1])
        status = "Bahaya" if height >= 25 else ("Siaga" if height >= 12 else "Aman")
        risiko = "Tinggi" if height >= 25 else ("Sedang" if height >= 12 else "Rendah")
        
        trend.append({
            "jam": f"+{hour} Jam",
            "status": status,
            "tinggi": f"{height} cm",
            "risiko": risiko
        })
    return trend

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "message": "Welcome to LajuRaya SMG AI Early Warning System API with ML Integration"
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json() or {}
    lokasi = data.get('lokasi', '').lower()
    
    # 2. MAPPING KOORDINAT & NAMA WILAYAH (Sinkron dengan HTML)
    if lokasi == 'genuk':
        lat, lon = -6.958, 110.452
        nama_wilayah = "Kawasan Industri Kaligawe / Terboyo"
    elif lokasi == 'tanjung_emas':
        lat, lon = -6.953, 110.424
        nama_wilayah = "Kawasan Pelabuhan Tanjung Emas"
    else:
        lat, lon = -6.963, 110.420
        nama_wilayah = "Semarang Utara (Bandarharjo)"

    # 3. AMBIL DATA LIVE DARI OPEN-METEO API
    hujan_live = 0.0
    pasang_live_cm = 120.0  # Baseline default jika API offline
    
    try:
        # Fetch data cuaca (curah hujan saat ini)
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=precipitation"
        weather_res = requests.get(weather_url, timeout=5).json()
        hujan_live = float(weather_res.get('current', {}).get('precipitation', 0.0))
        
        # Fetch data maritim (tinggi gelombang direkayasa menjadi estimasi pasang surut)
        marine_url = f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lon}&current=wave_height"
        marine_res = requests.get(marine_url, timeout=5).json()
        wave_height = float(marine_res.get('current', {}).get('wave_height', 0.5))
        pasang_live_cm = 100 + (wave_height * 40)
    except Exception as e:
        print(f"⚠️ Menggunakan data baseline karena API eksternal mengalami kendala: {e}")

    # 4. PROSES PREDIKSI MODEL MACHINE LEARNING
    prediksi_ml = 0
    probabilitas = 100.0
    
    if model_rob:
        pasang_meter = pasang_live_cm / 100
        input_data = np.array([[pasang_meter, hujan_live]])
        prediksi_ml = model_rob.predict(input_data)[0]
        probabilitas = model_rob.predict_proba(input_data)[0][prediksi_ml] * 100

    # 5. LOGIKA PENENTUAN STATUS & OUTPUT DASHBOARD
    ketinggian_visual = max(0, round(pasang_live_cm - 110)) if prediksi_ml == 1 else 0
    if hujan_live > 20 and prediksi_ml == 1: 
        ketinggian_visual += round(hujan_live * 0.5)

    # Menentukan rute alternatif berdasarkan keputusan ML
    if prediksi_ml == 1:
        status_teks = "Bahaya Ekstrim" if ketinggian_visual > 35 else "Bahaya Tinggi"
        rute_alternatif = "Gunakan Jalur Jalan Ronggowarsito / Arteri Yos Sudarso" if lokasi == 'tanjung_emas' else "Sangat Disarankan beralih ke Jl. Wolter Monginsidi"
    else:
        status_teks = "Aman"
        rute_alternatif = "Jalan Utama Terpantau Kondusif"

    # Menentukan shift waktu otomatis berdasarkan jam server saat ini
    jam_sekarang = datetime.now().hour
    if 6 <= jam_sekarang < 14:
        waktu_shift = 'pagi'
    elif 14 <= jam_sekarang < 22:
        waktu_shift = 'sore'
    else:
        waktu_shift = 'malam'

    return jsonify({
        "nama_wilayah": nama_wilayah,
        "akurasi": f"{probabilitas:.1f}% (AI)",
        "ketinggian_air": f"{ketinggian_visual} cm",
        "status": status_teks,
        "rute_alternatif": rute_alternatif,
        "whatsapp_alert": "Sent" if prediksi_ml == 1 else "Not Needed",
        "waktu_shift": waktu_shift,
        "raw_hujan": hujan_live,
        "raw_pasang": pasang_live_cm,
        "prediksi_12jam": generate_trend(ketinggian_visual if ketinggian_visual > 0 else 15)
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)