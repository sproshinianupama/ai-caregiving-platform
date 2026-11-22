"""
app.py  —  AI Prediction Service  (port 5002)
----------------------------------------------
Endpoints:
  GET  /predict              — generic 5-day forecast
  POST /predict-caregiver    — caregiver-specific 5-day forecast

The /predict-caregiver endpoint receives the caregiver's real booking
history from Node.js (aiController.js) and predicts demand using the
XGBoost model trained on caregiver-specific features.

XGBoost features (16 total — must match train_model.py FEATURES):
  care_type_code, district_code, experience_years, avg_rating,
  availability_score, emergency_cases, weekday, month, season,
  completed_bookings, cancelled_bookings,
  previous_day_requests, previous_3_day_average,
  previous_7_day_average, previous_14_day_average, monthly_average
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import datetime
import numpy as np
import pandas as pd

app = Flask(__name__)
CORS(app)

MIN_HISTORY = 5  # minimum entries before XGBoost runs

# ------------------------------------------------------------------
# Lookup tables matching generate_data.py encoding
# ------------------------------------------------------------------
CARE_TYPE_CODES = {"Childcare": 0, "Disabled Care": 1, "Eldercare": 2}
DISTRICT_CODES  = {
    "Anuradhapura": 0, "Badulla": 1, "Colombo": 2, "Galle": 3,
    "Gampaha": 4, "Kalutara": 5, "Kandy": 6, "Kurunegala": 7,
    "Matara": 8, "Ratnapura": 9
}

# ------------------------------------------------------------------
# Load model and feature list saved by train_model.py
# ------------------------------------------------------------------
try:
    xgb_model  = joblib.load("xgb_model.pkl")
    XGB_FEATURES = joblib.load("xgb_features.pkl")
    MODEL_LOADED = True
    print(f"XGBoost model loaded. Features: {XGB_FEATURES}")
except FileNotFoundError:
    xgb_model    = None
    XGB_FEATURES = []
    MODEL_LOADED = False
    print("WARNING: xgb_model.pkl not found. Run train_model.py first.")


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def get_season(month: int) -> int:
    if month in (12, 1, 2): return 0
    if month in (3, 4, 5):  return 1
    if month in (6, 7, 8):  return 2
    return 3


def build_feature_row(
    future_date: datetime.date,
    rolling: list,          # recent daily request counts (most recent last)
    avg_emergency: float,
    completed_ratio: float,
    cancelled_ratio: float,
    care_type_code: int,
    district_code: int,
    experience_years: int,
    avg_rating: float,
    availability_score: float,
) -> dict:
    n = len(rolling)
    prev1  = rolling[-1]                         if n >= 1  else 0
    prev3  = float(np.mean(rolling[-3:]))        if n >= 3  else prev1
    prev7  = float(np.mean(rolling[-7:]))        if n >= 7  else prev3
    prev14 = float(np.mean(rolling[-14:]))       if n >= 14 else prev7
    mon    = float(np.mean(rolling[-30:]))       if n >= 30 else prev14

    est_req       = prev7
    completed_est = round(est_req * completed_ratio)
    cancelled_est = round(est_req * cancelled_ratio)

    return {
        "care_type_code":          care_type_code,
        "district_code":           district_code,
        "experience_years":        experience_years,
        "avg_rating":              avg_rating,
        "availability_score":      availability_score,
        "emergency_cases":         max(0, round(avg_emergency)),
        "weekday":                  future_date.weekday(),
        "month":                    future_date.month,
        "season":                   get_season(future_date.month),
        "completed_bookings":       completed_est,
        "cancelled_bookings":       cancelled_est,
        "previous_day_requests":    prev1,
        "previous_3_day_average":   prev3,
        "previous_7_day_average":   prev7,
        "previous_14_day_average":  prev14,
        "monthly_average":          mon,
    }


def weighted_formula_fallback(daily: pd.DataFrame) -> list:
    """Fallback when not enough data for XGBoost."""
    weekday_avg = daily.groupby("weekday")["requests"].mean().to_dict()
    weekday_emg = daily.groupby("weekday")["emergency_cases"].mean().to_dict()
    overall_avg = float(daily["requests"].mean())
    overall_emg = float(daily["emergency_cases"].mean())
    recent_avg  = float(daily["requests"].tail(5).mean())
    recent_emg  = float(daily["emergency_cases"].tail(5).mean())
    trend = 0.0
    if len(daily) >= 4:
        trend = float(daily["requests"].tail(3).mean() - daily["requests"].head(3).mean())

    predictions = []
    today = datetime.date.today()
    for i in range(1, 6):
        fd  = today + datetime.timedelta(days=i)
        wd  = fd.weekday()
        val = (
            weekday_avg.get(wd, overall_avg) * 0.55
            + recent_avg * 0.35
            + overall_avg * 0.10
            + (weekday_emg.get(wd, overall_emg) - recent_emg) * 0.45
            + (0.6 if wd >= 5 else 0.0)
            + trend * (i / 5.0) * 0.35
        )
        predictions.append({"date": fd.strftime("%d %b"), "value": max(0, round(float(val), 1))})
    return predictions


# ==================================================================
# ROUTE 1 — /predict  (generic platform-level forecast)
# ==================================================================
@app.route("/predict", methods=["GET"])
def predict():
    today = datetime.date.today()
    predictions = []

    default_rolling = [20] * 30

    for i in range(1, 6):
        fd = today + datetime.timedelta(days=i)
        if MODEL_LOADED:
            row = build_feature_row(
                fd, default_rolling, 1.8, 0.75, 0.10,
                care_type_code=2,    # Eldercare default
                district_code=2,     # Colombo default
                experience_years=3,
                avg_rating=4.0,
                availability_score=0.8,
            )
            X   = pd.DataFrame([row])[XGB_FEATURES]
            val = max(0, round(float(xgb_model.predict(X)[0]), 1))
        else:
            val = float(20 + (8 if fd.weekday() >= 5 else 0))

        predictions.append({"date": fd.strftime("%d %b"), "value": val})

    return jsonify(predictions)


# ==================================================================
# ROUTE 2 — /predict-caregiver  (caregiver-specific 5-day forecast)
# ==================================================================
@app.route("/predict-caregiver", methods=["POST"])
def predict_caregiver():
    """
    POST body (from aiController.js):
    {
      "history": [
        { "service_date": "2025-01-15T00:00:00.000Z", "emergency_cases": 1 },
        ...
      ],
      "caregiver": {
        "careTypes":       ["Eldercare"],
        "district":        "Colombo",
        "experienceYears": 5,
        "avgRating":       4.2,
        "emergencyAvailable": true
      }
    }
    """
    payload      = request.get_json(silent=True) or {}
    history      = payload.get("history", [])
    cg_meta      = payload.get("caregiver", {})

    if len(history) < MIN_HISTORY:
        return jsonify({
            "message": (
                f"At least {MIN_HISTORY} accepted or completed requests are needed "
                "before predictions are shown."
            )
        }), 400

    # ------------------------------------------------------------------
    # Parse caregiver profile metadata
    # ------------------------------------------------------------------
    care_types_list = cg_meta.get("careTypes", [])
    care_type_str   = care_types_list[0] if care_types_list else "Eldercare"
    care_type_code  = CARE_TYPE_CODES.get(care_type_str, 2)

    district_str   = cg_meta.get("district", "Colombo")
    district_code  = DISTRICT_CODES.get(district_str, 2)

    experience_years   = int(cg_meta.get("experienceYears", 0))
    avg_rating         = float(cg_meta.get("avgRating", 4.0))
    availability_score = 1.0 if cg_meta.get("emergencyAvailable", False) else 0.7

    # ------------------------------------------------------------------
    # Parse booking history into daily aggregated DataFrame
    # ------------------------------------------------------------------
    df = pd.DataFrame(history)
    df["service_date"] = pd.to_datetime(df["service_date"])
    df["weekday"]      = df["service_date"].dt.weekday

    daily = (
        df.groupby(df["service_date"].dt.date)
        .agg(
            requests=("service_date", "size"),
            emergency_cases=("emergency_cases", "sum"),
            weekday=("weekday", "first"),
        )
        .reset_index(names=["service_date"])
        .sort_values("service_date")
        .reset_index(drop=True)
    )

    avg_emergency    = float(daily["emergency_cases"].mean())
    completed_ratio  = 0.75
    cancelled_ratio  = 0.10
    rolling_requests = list(daily["requests"])

    # ------------------------------------------------------------------
    # XGBoost prediction (requires model + at least 14 daily data points)
    # ------------------------------------------------------------------
    if MODEL_LOADED and len(daily) >= 14:
        predictions = []
        today = datetime.date.today()

        for i in range(1, 6):
            fd  = today + datetime.timedelta(days=i)
            row = build_feature_row(
                fd,
                rolling_requests,
                avg_emergency,
                completed_ratio,
                cancelled_ratio,
                care_type_code,
                district_code,
                experience_years,
                avg_rating,
                availability_score,
            )
            X   = pd.DataFrame([row])[XGB_FEATURES]
            val = float(xgb_model.predict(X)[0])
            val = max(0, round(val, 1))

            predictions.append({"date": fd.strftime("%d %b"), "value": val})
            rolling_requests.append(val)  # feed prediction forward

        return jsonify(predictions)

    # ------------------------------------------------------------------
    # Weighted formula fallback
    # ------------------------------------------------------------------
    return jsonify(weighted_formula_fallback(daily))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
