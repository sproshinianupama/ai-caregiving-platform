"""
train_random_forest.py
----------------------
Trains a Random Forest Regressor for caregiver-specific demand prediction
using the same dataset and features used by the final XGBoost model.

Evaluation: RMSE, MAE, R², MAPE
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
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

print("=" * 60)
print("  Random Forest — Caregiver-Specific Demand Prediction")
print("=" * 60)

print(f"\nDataset shape : {df.shape[0]} rows x {df.shape[1]} columns")
print(f"Features used : {len(FEATURES)}")
print(f"Target        : {TARGET}")

# ------------------------------------------------------------------
# 2. Same 80/20 non-shuffled split as XGBoost
# ------------------------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    shuffle=False
)

print(f"\nTrain samples : {len(X_train)}")
print(f"Test samples  : {len(X_test)}")

# ------------------------------------------------------------------
# 3. Train Random Forest
# ------------------------------------------------------------------

model = RandomForestRegressor(
    n_estimators=300,
    max_depth=6,
    min_samples_split=2,
    min_samples_leaf=1,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

print("\nTraining complete.")

# ------------------------------------------------------------------
# 4. Predictions
# ------------------------------------------------------------------

y_pred = model.predict(X_test)

# Demand cannot be negative
y_pred = np.clip(y_pred, 0, None)

# ------------------------------------------------------------------
# 5. Evaluation — RMSE, MAE, R², MAPE
# ------------------------------------------------------------------

rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
mae  = float(mean_absolute_error(y_test, y_pred))
r2   = float(r2_score(y_test, y_pred))

# MAPE only for observations where actual requests > 0
mask = y_test > 0

mape = float(
    np.mean(
        np.abs(
            (y_test[mask] - y_pred[mask]) /
            y_test[mask]
        )
    ) * 100
)

accuracy = 100 - mape

# ------------------------------------------------------------------
# 6. Display results
# ------------------------------------------------------------------

print("\n" + "=" * 60)
print("  Random Forest Model Evaluation Results")
print("=" * 60)

print(f"  RMSE                : {rmse:.4f}")
print(f"  MAE                 : {mae:.4f}")
print(f"  R² Score            : {r2:.4f}  ({r2 * 100:.1f} %)")
print(f"  MAPE                : {mape:.2f} %")
print(f"  Prediction Accuracy : {accuracy:.1f} %")

print("=" * 60)

# ------------------------------------------------------------------
# 7. Feature Importance
# ------------------------------------------------------------------

importance = pd.Series(
    model.feature_importances_,
    index=FEATURES
)

importance_sorted = importance.sort_values(
    ascending=False
)

print("\nFeature Importance (Random Forest):")
print("-" * 60)

for feat, score in importance_sorted.items():
    bar = "█" * int(score * 50)
    print(f"  {feat:<30} {score:.4f}  {bar}")

# ------------------------------------------------------------------
# 8. Save Random Forest model
# ------------------------------------------------------------------

joblib.dump(model, "rf_model.pkl")

print("\nModel saved → rf_model.pkl")
print("\nRandom Forest training completed successfully.")
