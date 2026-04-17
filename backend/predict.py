from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import json
import os

app = Flask(__name__)

# CORS: In production, restrict to your Vercel domain via CORS_ORIGINS env var
# e.g. CORS_ORIGINS=https://your-app.vercel.app
cors_origins = os.environ.get('CORS_ORIGINS', '*')
if cors_origins != '*':
    cors_origins = [o.strip() for o in cors_origins.split(',')]
CORS(app, origins=cors_origins)

# ─────────────────────────────────────────────
# Load ALL model files on startup
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Model 1: AQI Category
with open(os.path.join(BASE_DIR, "aqi_model.pkl"), "rb") as f:
    aqi_model = pickle.load(f)
with open(os.path.join(BASE_DIR, "label_encoder.pkl"), "rb") as f:
    aqi_le = pickle.load(f)
with open(os.path.join(BASE_DIR, "model_meta.json"), "r") as f:
    aqi_meta = json.load(f)

# Model 2: Health Risk
with open(os.path.join(BASE_DIR, "health_model.pkl"), "rb") as f:
    health_model = pickle.load(f)
with open(os.path.join(BASE_DIR, "health_label_encoder.pkl"), "rb") as f:
    health_le = pickle.load(f)

# Model 3: Dominant Pollutant
with open(os.path.join(BASE_DIR, "pollutant_model.pkl"), "rb") as f:
    pollutant_model = pickle.load(f)
with open(os.path.join(BASE_DIR, "pollutant_label_encoder.pkl"), "rb") as f:
    pollutant_le = pickle.load(f)

with open(os.path.join(BASE_DIR, "health_model_meta.json"), "r") as f:
    health_meta = json.load(f)

# AI Control Recommendations
AI_CONTROL = health_meta.get("ai_control_database", {})

print("✅ All models loaded!")
print(f"   Model 1 — AQI Category: {aqi_meta['classes']}  (accuracy: {aqi_meta['accuracy']*100:.1f}%)")
print(f"   Model 2 — Health Risk: {health_meta['health_classes']} ({health_meta['health_accuracy']*100:.1f}%)")
print(f"   Model 3 — Dominant Pollutant: {health_meta['pollutant_classes']} ({health_meta['pollutant_accuracy']*100:.1f}%)")
print(f"   Cities: {health_meta.get('cities', 0)} | Dataset: {health_meta.get('dataset_rows', 0):,} rows")


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "AURA ML API running",
        "models": {
            "aqi_category": {"classes": aqi_meta["classes"], "accuracy": aqi_meta["accuracy"]},
            "health_risk":  {"classes": health_meta["health_classes"],    "accuracy": health_meta["health_accuracy"]},
            "pollutant":    {"classes": health_meta["pollutant_classes"], "accuracy": health_meta["pollutant_accuracy"]},
        },
        "dataset": {
            "cities": health_meta.get("cities", 0),
            "rows": health_meta.get("dataset_rows", 0),
            "continents": health_meta.get("continents", []),
        },
    })


@app.route("/predict", methods=["POST"])
def predict():
    """AQI category prediction (6 features)."""
    try:
        data = request.get_json()
        co    = float(data.get("co", 0))
        ozone = float(data.get("ozone", 0))
        no2   = float(data.get("no2", 0))
        pm25  = float(data.get("pm25", 0))
        pm10  = float(data.get("pm10", 0))
        so2   = float(data.get("so2", 0))

        features = [[co, ozone, no2, pm25, pm10, so2]]
        pred_enc   = aqi_model.predict(features)[0]
        pred_label = aqi_le.inverse_transform([pred_enc])[0]
        probs      = aqi_model.predict_proba(features)[0]
        confidence = round(float(max(probs)) * 100, 2)

        # Compute quality label
        max_val = max(co, ozone, no2, pm25, pm10, so2)
        if max_val <= 25: quality = "Best"
        elif max_val <= 50: quality = "Better"
        elif max_val <= 100: quality = "Good"
        elif max_val <= 150: quality = "Moderate"
        elif max_val <= 200: quality = "Bad"
        elif max_val <= 300: quality = "Worse"
        else: quality = "Worst"

        return jsonify({
            "prediction": pred_label,
            "confidence": confidence,
            "quality": quality,
            "input": {"co_aqi": co, "ozone_aqi": ozone, "no2_aqi": no2,
                      "pm25_aqi": pm25, "pm10_aqi": pm10, "so2_aqi": so2}
        })
    except KeyError as e:
        return jsonify({"error": f"Missing field: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/predict/health", methods=["POST"])
def predict_health():
    """Health risk + dominant pollutant + AI control recommendation (6 features)."""
    try:
        data = request.get_json()
        co    = float(data.get("co", 0))
        ozone = float(data.get("ozone", 0))
        no2   = float(data.get("no2", 0))
        pm25  = float(data.get("pm25", 0))
        pm10  = float(data.get("pm10", 0))
        so2   = float(data.get("so2", 0))

        features = [[co, ozone, no2, pm25, pm10, so2]]

        # Health Risk prediction
        h_enc   = health_model.predict(features)[0]
        h_label = health_le.inverse_transform([h_enc])[0]
        h_probs = health_model.predict_proba(features)[0]
        h_conf  = round(float(max(h_probs)) * 100, 2)

        # Dominant Pollutant prediction
        p_enc   = pollutant_model.predict(features)[0]
        p_label = pollutant_le.inverse_transform([p_enc])[0]
        p_probs = pollutant_model.predict_proba(features)[0]
        p_conf  = round(float(max(p_probs)) * 100, 2)

        # All class probabilities for health risk
        h_all = {health_le.inverse_transform([i])[0]: round(float(p)*100, 1)
                 for i, p in enumerate(h_probs)}

        # AI Control Recommendations for the dominant pollutant
        ctrl = AI_CONTROL.get(p_label, {})
        ai_control = {
            "dominant_pollutant": p_label,
            "pollution_source": ctrl.get("source", "Unknown"),
            "ai_strategies": ctrl.get("strategies", []),
            "tech_stack": ctrl.get("tech", ""),
        }

        # Compute quality label
        max_val = max(co, ozone, no2, pm25, pm10, so2)
        if max_val <= 25: quality = "Best"
        elif max_val <= 50: quality = "Better"
        elif max_val <= 100: quality = "Good"
        elif max_val <= 150: quality = "Moderate"
        elif max_val <= 200: quality = "Bad"
        elif max_val <= 300: quality = "Worse"
        else: quality = "Worst"

        return jsonify({
            "health_risk": h_label,
            "health_confidence": h_conf,
            "health_probabilities": h_all,
            "dominant_pollutant": p_label,
            "pollutant_confidence": p_conf,
            "quality": quality,
            "ai_control": ai_control,
            "input": {
                "co_aqi": co, "ozone_aqi": ozone, "no2_aqi": no2,
                "pm25_aqi": pm25, "pm10_aqi": pm10, "so2_aqi": so2
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/cities", methods=["GET"])
def city_rankings():
    """Return city-level AQI rankings with health risk, dominant pollutant, and AI control."""
    category = request.args.get("category", None)
    continent = request.args.get("continent", None)

    cities = health_meta.get("city_rankings", [])

    quality = request.args.get("quality", None)

    if category:
        cities = [c for c in cities if c.get("aqi_category") == category]
    if continent:
        cities = [c for c in cities if c.get("continent") == continent]
    if quality:
        cities = [c for c in cities if c.get("aqi_quality") == quality]

    return jsonify({
        "cities": cities,
        "total": len(cities),
    })


@app.route("/cities/categories", methods=["GET"])
def city_categories():
    """Return cities grouped by AQI category."""
    return jsonify({
        "categories": health_meta.get("category_wise_cities", {}),
    })


@app.route("/cities/quality", methods=["GET"])
def city_quality():
    """Return cities grouped by quality label (Best/Better/Good/Moderate/Bad/Worse/Worst)."""
    return jsonify({
        "quality_groups": health_meta.get("quality_wise_cities", {}),
    })


@app.route("/pollutants/hotspots", methods=["GET"])
def pollutant_hotspots():
    """Return top polluted cities per pollutant with AI control recommendations."""
    pollutant = request.args.get("pollutant", None)

    hotspots = health_meta.get("pollutant_hotspots", {})
    if pollutant and pollutant in hotspots:
        return jsonify({"pollutant": pollutant, **hotspots[pollutant]})

    return jsonify({"hotspots": hotspots})


@app.route("/ai/control", methods=["POST"])
def ai_control_recommendations():
    """Get AI-powered pollution control recommendations for a specific pollutant or city."""
    data = request.get_json()
    pollutant = data.get("pollutant", None)
    city_name = data.get("city", None)

    if pollutant and pollutant in AI_CONTROL:
        ctrl = AI_CONTROL[pollutant]
        return jsonify({
            "pollutant": pollutant,
            "source": ctrl["source"],
            "strategies": ctrl["strategies"],
            "tech_stack": ctrl["tech"],
        })

    if city_name:
        cities = health_meta.get("city_rankings", [])
        city = next((c for c in cities if c["city"].lower() == city_name.lower()), None)
        if city:
            dominant = city.get("dominant_pollutant", "PM2.5")
            ctrl = AI_CONTROL.get(dominant, {})
            return jsonify({
                "city": city["city"],
                "country": city["country"],
                "latitude": city.get("latitude", 0),
                "longitude": city.get("longitude", 0),
                "avg_aqi": city["avg_aqi"],
                "aqi_category": city.get("aqi_category", ""),
                "aqi_quality": city.get("aqi_quality", ""),
                "health_risk": city.get("health_risk", ""),
                "dominant_pollutant": dominant,
                "pollutant_averages": city.get("pollutant_averages", {}),
                "pollution_source": ctrl.get("source", ""),
                "ai_strategies": city.get("ai_control_strategies", ctrl.get("strategies", [])),
                "tech_stack": city.get("ai_tech_stack", ctrl.get("tech", "")),
            })
        return jsonify({"error": f"City '{city_name}' not found"}), 404

    # Return all pollutant controls
    return jsonify({"controls": AI_CONTROL})


@app.route("/dataset/stats", methods=["GET"])
def dataset_stats():
    """Return dataset statistics and distribution info."""
    return jsonify({
        "total_rows": health_meta.get("dataset_rows", 0),
        "total_cities": health_meta.get("cities", 0),
        "continents": health_meta.get("continents", []),
        "category_distribution": health_meta.get("category_distribution", {}),
        "quality_distribution": health_meta.get("quality_distribution", {}),
        "health_accuracy": health_meta.get("health_accuracy", 0),
        "pollutant_accuracy": health_meta.get("pollutant_accuracy", 0),
        "features": health_meta.get("features", []),
        "quality_labels": ["Best", "Better", "Good", "Moderate", "Bad", "Worse", "Worst"],
    })


# ─────────────────────────────────────────────
# Run server
# ─────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_ENV", "development") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)
