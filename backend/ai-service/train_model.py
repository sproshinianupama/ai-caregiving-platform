"""
train_model.py
--------------
Trains a caregiver-specific XGBoost Regressor.

Features used (13 total):
  Caregiver profile : care_type_code, district_code,
                      experience_years, avg_rating, availability_score
  Time-based        : emergency_cases, weekday, month, season
  Booking history   : completed_bookings, cancelled_bookings
  Rolling lags      : previous_day_requests, previous_3_day_average,
                      previous_7_day_average, previous_14_day_average,
                      monthly_average

Target  : requests (next-day booking count for this caregiver)

Evaluation output  : RMSE, MAE, R², MAPE, Prediction Accuracy
Model saved as     : xgb_model.pkl
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import xgboost as xgb
import joblib

# ------------------------------------------------------------------
# 1. Load dataset
# ------------------------------------------------------------------
df = pd.read_csv("booking_dataset.csv")

FEATURES = [
    # Caregiver profile features
    "care_type_code",
    "district_code",
    "experience_years",
    "avg_rating",
    "availability_score",
    # Time features
    "emergency_cases",
    "weekday",
    "month",
    "season",
    # Booking history features
    "completed_bookings",
    "cancelled_bookings",
    # Rolling lag features
    "previous_day_requests",
    "previous_3_day_average",
    "previous_7_day_average",
    "previous_14_day_average",
    "monthly_average",
]

TARGET = "requests"

df.dropna(subset=FEATURES + [TARGET], inplace=True)

X = df[FEATURES]
y = df[TARGET]

print("=" * 55)
print("  XGBoost — Caregiver-Specific Demand Prediction")
print("=" * 55)
print(f"\nDataset shape : {df.shape[0]} rows x {df.shape[1]} columns")
print(f"Features used : {len(FEATURES)}")
print(f"Target        : {TARGET}")
print(f"\nFinal dataset columns:")
print(list(df.columns))

# ------------------------------------------------------------------
# 2. Train / test split  (80 / 20 — no shuffle for time-series order)
# ------------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, shuffle=False
)

print(f"\nTrain samples : {len(X_train)}")
print(f"Test  samples : {len(X_test)}")

# ------------------------------------------------------------------
# 3. Train XGBoost Regressor
# ------------------------------------------------------------------
model = xgb.XGBRegressor(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,
    reg_alpha=0.1,       # L1 regularisation
    reg_lambda=1.0,      # L2 regularisation
    random_state=42,
    verbosity=0,
)

model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False,
)

print("\nTraining complete.")

# ------------------------------------------------------------------
# 4. Evaluate — RMSE, MAE, R², MAPE
# ------------------------------------------------------------------
y_pred = model.predict(X_test)
y_pred = np.clip(y_pred, 0, None)

rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
mae  = float(mean_absolute_error(y_test, y_pred))
r2   = float(r2_score(y_test, y_pred))

mask = y_test > 0
mape = float(
    np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask])) * 100
)
accuracy = 100 - mape

print("\n" + "=" * 55)
print("  Model Evaluation Results")
print("=" * 55)
print(f"  RMSE                : {rmse:.4f}")
print(f"  MAE                 : {mae:.4f}")
print(f"  R² Score            : {r2:.4f}  ({r2 * 100:.1f} %)")
print(f"  MAPE                : {mape:.2f} %")
print(f"  Prediction Accuracy : {accuracy:.1f} %")
print("=" * 55)

# ------------------------------------------------------------------
# 5. Feature importance — printed for dissertation Chapter 4/5
# ------------------------------------------------------------------
importance = pd.Series(model.feature_importances_, index=FEATURES)
importance_sorted = importance.sort_values(ascending=False)

print("\nFeature Importance (XGBoost gain score):")
print("-" * 55)
for feat, score in importance_sorted.items():
    bar = "█" * int(score * 50)
    print(f"  {feat:<30} {score:.4f}  {bar}")

# ------------------------------------------------------------------
# 6. Save model and feature list
# ------------------------------------------------------------------
joblib.dump(model, "xgb_model.pkl")
joblib.dump(FEATURES, "xgb_features.pkl")   # saved so app.py always uses same order

print("\nModel saved  → xgb_model.pkl")
print("Features saved → xgb_features.pkl")
print("\nNow run:  python app.py")
