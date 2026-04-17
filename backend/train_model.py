"""
Train AQI Category Classifier
──────────────────────────────
Uses the enhanced global pollution dataset with 60+ cities.
Predicts AQI Category: Good / Moderate / Unhealthy for Sensitive Groups /
                        Unhealthy / Very Unhealthy / Hazardous
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import pickle
import json
import os

# ─────────────────────────────────────────────
# 1. Load dataset
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "global_air_pollution_dataset.csv")

print("📂 Loading dataset...")
df = pd.read_csv(CSV_PATH)
print(f"   {len(df):,} rows loaded")
print(f"   Cities: {df['City'].nunique()}")
print(f"   Countries: {df['Country'].nunique()}")

# ─────────────────────────────────────────────
# 2. Select features and target
# ─────────────────────────────────────────────
FEATURES = ["CO AQI Value", "Ozone AQI Value", "NO2 AQI Value",
            "PM2.5 AQI Value", "PM10 AQI Value", "SO2 AQI Value"]
TARGET = "AQI Category"

df = df[FEATURES + [TARGET]].dropna()
print(f"   {len(df):,} rows after dropping nulls")

X = df[FEATURES].values
y = df[TARGET].values

# ─────────────────────────────────────────────
# 3. Encode labels
# ─────────────────────────────────────────────
le = LabelEncoder()
y_encoded = le.fit_transform(y)
print(f"   Classes: {list(le.classes_)}")

# ─────────────────────────────────────────────
# 4. Train / test split
# ─────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

# ─────────────────────────────────────────────
# 5. Train Random Forest
# ─────────────────────────────────────────────
print("\n🌲 Training Random Forest...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=None,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# ─────────────────────────────────────────────
# 6. Evaluate
# ─────────────────────────────────────────────
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"\n✅ Accuracy: {accuracy * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=le.classes_))

# ─────────────────────────────────────────────
# 7. Feature importances
# ─────────────────────────────────────────────
importances = dict(zip(FEATURES, model.feature_importances_))
print("\n📊 Feature Importances:")
for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
    print(f"   {feat}: {imp:.4f}")

# ─────────────────────────────────────────────
# 8. Save model files
# ─────────────────────────────────────────────
MODEL_PATH   = os.path.join(BASE_DIR, "aqi_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "label_encoder.pkl")
META_PATH    = os.path.join(BASE_DIR, "model_meta.json")

with open(MODEL_PATH, "wb") as f:
    pickle.dump(model, f)

with open(ENCODER_PATH, "wb") as f:
    pickle.dump(le, f)

meta = {
    "features": FEATURES,
    "classes":  list(le.classes_),
    "accuracy": round(accuracy, 4),
    "n_estimators": 200,
    "feature_importances": {k: round(v, 4) for k, v in importances.items()},
}
with open(META_PATH, "w") as f:
    json.dump(meta, f, indent=2)

print(f"\n📦 Saved:")
print(f"   aqi_model.pkl")
print(f"   label_encoder.pkl")
print(f"   model_meta.json")
print(f"\n🎉 Done! AQI model is ready to use in AURA.")
