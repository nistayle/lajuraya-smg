from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from ultralytics import YOLO
import os
import joblib
import numpy as np
import requests
import pandas as pd

app = Flask(__name__)
# CORS Aktif agar Frontend dari Vercel/Live Server bebas menembak API ini
CORS(app)

# ==========================================
# 1. LOAD SEMUA MODEL AI (YOLOv8 & ML)
# ==========================================
MODEL_YOLO_PATH = "backend/best.pt" if os.path.exists("backend/best.pt") else "best.pt"
if os.path.exists(MODEL_YOLO_PATH):
    model_yolo = YOLO(MODEL_YOLO_PATH)
    print("🚀 Model YOLOv8 Berhasil Dimuat!")
else:
    print(f"⚠️ File YOLOv8 ({MODEL_YOLO_PATH}) tidak ditemukan!")
    model_yolo = None

MODEL_ML_PATH = "backend/model_rob_semarang.pkl" if os.path.exists("backend/model_rob_semarang.pkl") else "model_rob_semarang.pkl"
try:
    model_rob = joblib.load(MODEL_ML_PATH)
    print("🚀 Model Machine Learning (PKL) Berhasil Dimuat!")
except Exception as e:
    print(f"⚠️ Gagal memuat model ML PKL. Error: {e}")
    model_rob = None


# ==========================================
# HELPER: Generator Tren Prediksi 12 Jam Ke Depan
# ==========================================
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


# ==========================================
# 2. ROUTE API ENDPOINTS
# ==========================================

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "message": "Welcome to LajuRaya SMG AI Early Warning System API"
    })


# --- ENDPOINT 1: PREDIKSI BERBASIS COMPUTER VISION (YOLOv8) ---
@app.route('/api/predict/cctv', methods=['GET', 'POST'])
def get_cctv_status():
    if model_yolo is None:
        return jsonify({"error": "Model YOLOv8 belum siap"}), 500

    try:
        # AI memproses gambar simulasi CCTV
        source_img = "data/ninini.jpg" 
        results = model_yolo.predict(source=source_img, conf=0.25, save=False, verbose=False)
        result = results[0]

        # Logika Otomatis menentukan status berdasarkan deteksi genangan air dari YOLO
        if result.masks is not None and len(result.masks) > 0:
            status_banjir = "BAHAYA"
            ketinggian_air = 28 
            rekomendasi = "TIDAK AMAN - Filter udara motor matic berisiko terendam. Cari rute alternatif!"
            akurasi = float(result.boxes.conf[0]) if result.boxes is not None else 0.68
        else:
            status_banjir = "AMAN"
            ketinggian_air = 0
            rekomendasi = "AMAN - Jalan kering bebas genangan rob."
            akurasi = 0.00

        data_cctv = [
            {
                "id": "cctv-kaligawe-01",
                "nama_lokasi": "Jl. Raya Kaligawe (Depan RSI Sultan Agung)",
                "latitude": -6.9532,
                "longitude": 110.4578,
                "status_banjir": status_banjir,
                "ketinggian_air_cm": ketinggian_air,
                "akurasi_ai": round(akurasi, 2),
                "rekomendasi_matic": rekomendasi
            }
        ]
        return jsonify(data_cctv), 200

    except Exception as e:
        return jsonify({"error": f"YOLO Error: {str(e)}"}), 500


# --- ENDPOINT 2: PREDIKSI BERBASIS MACHINE LEARNING LAMA (INDEX KEAMANAN) ---
@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json() or {}
    lokasi = data.get('lokasi', '').lower()
    
    if lokasi == 'genuk':
        lat, lon = -6.958, 110.452
        nama_wilayah = "Kawasan Industri Kaligawe / Terboyo"
    elif lokasi == 'tanjung_emas':
        lat, lon = -6.953, 110.424
        nama_wilayah = "Kawasan Pelabuhan Tanjung Emas"
    else:
        lat, lon = -6.963, 110.420
        nama_wilayah = "Semarang Utara (Bandarharjo)"

    hujan_live = 0.0
    pasang_live_cm = 120.0  
    
    try:
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=precipitation"
        weather_res = requests.get(weather_url, timeout=5).json()
        hujan_live = float(weather_res.get('current', {}).get('precipitation', 0.0))
        
        marine_url = f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lon}&current=wave_height"
        marine_res = requests.get(marine_url, timeout=5).json()
        wave_height = float(marine_res.get('current', {}).get('wave_height', 0.5))
        pasang_live_cm = 100 + (wave_height * 40)
    except Exception as e:
        print(f"⚠️ Menggunakan data baseline cuaca: {e}")

    prediksi_ml = 0
    probabilitas = 100.0
    
    # KODE BARU YANG BERSIH:
    if model_rob:
        # Perhatikan space/jarak masuk ke dalam di bawah ini (Gunakan Tab atau 4 Spasi)
        pasang_meter = pasang_live_cm / 100
        input_data = pd.DataFrame([[pasang_meter, hujan_live]], columns=model_rob.feature_names_in_)
        prediksi_ml = model_rob.predict(input_data)[0]
        probabilitas = model_rob.predict_proba(input_data)[0][prediksi_ml] * 100

    ketinggian_visual = max(0, round(pasang_live_cm - 110)) if prediksi_ml == 1 else 0
    if hujan_live > 20 and prediksi_ml == 1: 
        ketinggian_visual += round(hujan_live * 0.5)

    if prediksi_ml == 1:
        status_teks = "Bahaya Ekstrim" if ketinggian_visual > 35 else "Bahaya Tinggi"
        rute_alternatif = "Gunakan Jalur Jalan Ronggowarsito / Arteri Yos Sudarso" if lokasi == 'tanjung_emas' else "Sangat Disarankan beralih ke Jl. Wolter Monginsidi"
    else:
        status_teks = "Aman"
        rute_alternatif = "Jalan Utama Terpantau Kondusif"

    jam_sekarang = datetime.now().hour
    waktu_shift = 'pagi' if 6 <= jam_sekarang < 14 else ('sore' if 14 <= jam_sekarang < 22 else 'malam')

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
    # Berjalan stabil di localhost port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)