from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "message": "Welcome to LajuRaya SMG AI Early Warning System API"
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json() or {}
    lokasi = data.get('lokasi', '').lower()
    
    # 12-Hour mock trend generator to ensure clean variations
    def generate_trend(peak_level, location_name):
        trend = []
        # Profiles for tide level multiplier throughout 12 hours:
        # Puncak ada di jam ke-5 hingga ke-8, surut di jam ke-10 keatas
        tide_profile = [0.35, 0.45, 0.65, 0.90, 0.98, 1.0, 0.95, 0.85, 0.68, 0.50, 0.35, 0.20]
        
        for hour in range(1, 13):
            height = round(peak_level * tide_profile[hour-1])
            
            # Determine risk and status based on height
            if height >= 45:
                status = "Bahaya"
                risiko = "Ekstrim"
            elif height >= 25:
                status = "Bahaya"
                risiko = "Tinggi"
            elif height >= 12:
                status = "Siaga"
                risiko = "Sedang"
            else:
                status = "Aman"
                risiko = "Rendah"
                
            trend.append({
                "jam": f"+{hour} Jam",
                "status": status,
                "tinggi": f"{height} cm",
                "risiko": risiko
            })
        return trend

    if lokasi == 'kaligawe':
        response = {
            "nama_wilayah": "Kawasan Industri Kaligawe / Terboyo",
            "akurasi": "91.2%",
            "ketinggian_air": "33 cm",
            "status": "Bahaya Tinggi",
            "rute_alternatif": "Sangat Disarankan beralih ke Jl. Wolter Monginsidi",
            "whatsapp_alert": "Sent",
            "prediksi_12jam": generate_trend(35, "Kaligawe")
        }
        return jsonify(response), 200
        
    elif lokasi == 'tanjung_emas':
        response = {
            "nama_wilayah": "Kawasan Pelabuhan Tanjung Emas",
            "akurasi": "89.5%",
            "ketinggian_air": "52 cm",
            "status": "Bahaya Ekstrim",
            "rute_alternatif": "Gunakan Jalur Jalan Ronggowarsito / Arteri Yos Sudarso",
            "whatsapp_alert": "Sent",
            "prediksi_12jam": generate_trend(55, "Tanjung Emas")
        }
        return jsonify(response), 200
        
    else:
        response = {
            "nama_wilayah": f"Area {lokasi.capitalize() if lokasi else 'Semarang Utara'}",
            "akurasi": "85.0%",
            "ketinggian_air": "24 cm",
            "status": "Aman Bersyarat",
            "rute_alternatif": "Jalan Utama Terpantau Kondusif",
            "whatsapp_alert": "Not Needed",
            "prediksi_12jam": generate_trend(25, lokasi or "Semarang Utara")
        }
        return jsonify(response), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
