"""
generate_data.py
----------------
Generates a realistic synthetic booking dataset for training the XGBoost model.

Final dataset columns (matching train_model.py FEATURES + TARGET):
  caregiver_id, care_type, district, experience_years, avg_rating,
  availability_score, emergency_cases, weekday, month, season,
  completed_bookings, cancelled_bookings,
  previous_day_requests, previous_3_day_average,
  previous_7_day_average, previous_14_day_average, monthly_average,
  requests  <-- TARGET

This is a caregiver-specific dataset: each row represents one caregiver
on one day. The model therefore learns patterns per caregiver profile.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

random.seed(42)
np.random.seed(42)

START_DATE = datetime(2022, 1, 1)
DAYS = 800           # per caregiver
NUM_CAREGIVERS = 15  # synthetic caregivers — gives ~12,000 rows total

CARE_TYPES  = ["Childcare", "Eldercare", "Disabled Care"]
DISTRICTS   = [
    "Colombo", "Gampaha", "Kandy", "Galle", "Kurunegala",
    "Kalutara", "Matara", "Ratnapura", "Anuradhapura", "Badulla"
]


def get_season(month: int) -> int:
    if month in (12, 1, 2): return 0   # Winter
    if month in (3, 4, 5):  return 1   # Spring
    if month in (6, 7, 8):  return 2   # Summer
    return 3                            # Autumn


all_rows = []

for cg_idx in range(NUM_CAREGIVERS):
    caregiver_id    = f"CG{cg_idx + 1:03d}"
    care_type       = random.choice(CARE_TYPES)
    district        = random.choice(DISTRICTS)
    experience_years = random.randint(0, 15)
    avg_rating       = round(random.uniform(3.0, 5.0), 1)
    # availability_score: 0-1, higher = more available
    availability_score = round(random.uniform(0.5, 1.0), 2)

    # Base demand for this caregiver (experience & rating boost demand)
    caregiver_base = 10 + experience_years * 0.4 + (avg_rating - 3.0) * 1.5

    daily_requests = []

    for i in range(DAYS):
        date      = START_DATE + timedelta(days=i)
        weekday   = date.weekday()
        month     = date.month
        season    = get_season(month)

        base = caregiver_base

        # Weekend boost
        if weekday >= 5:
            base += 4

        # Seasonal boost
        base += {0: -2, 1: 1, 2: 4, 3: 0}[season]

        # Care-type boost
        base += {"Eldercare": 2, "Childcare": 1, "Disabled Care": 3}[care_type]

        # Availability dampens demand
        base *= availability_score

        # Emergency cases
        emergency_cases = int(np.random.poisson(1.5))

        # Final demand
        demand = base + emergency_cases * 1.5 + np.random.normal(0, 2)
        demand = max(1, round(float(demand)))

        completed = round(demand * random.uniform(0.68, 0.82))
        cancelled = round(demand * random.uniform(0.05, 0.14))

        daily_requests.append(demand)

        all_rows.append({
            "caregiver_id":        caregiver_id,
            "care_type":           care_type,
            "district":            district,
            "experience_years":    experience_years,
            "avg_rating":          avg_rating,
            "availability_score":  availability_score,
            "date":                date.strftime("%Y-%m-%d"),
            "requests":            demand,
            "emergency_cases":     emergency_cases,
            "weekday":             weekday,
            "month":               month,
            "season":              season,
            "completed_bookings":  completed,
            "cancelled_bookings":  cancelled,
        })

df = pd.DataFrame(all_rows)

# ------------------------------------------------------------------
# Add lagged / rolling features PER CAREGIVER
# ------------------------------------------------------------------
df = df.sort_values(["caregiver_id", "date"]).reset_index(drop=True)

df["previous_day_requests"]   = df.groupby("caregiver_id")["requests"].shift(1)
df["previous_3_day_average"]  = df.groupby("caregiver_id")["requests"].shift(1).transform(lambda x: x.rolling(3,  min_periods=1).mean())
df["previous_7_day_average"]  = df.groupby("caregiver_id")["requests"].shift(1).transform(lambda x: x.rolling(7,  min_periods=1).mean())
df["previous_14_day_average"] = df.groupby("caregiver_id")["requests"].shift(1).transform(lambda x: x.rolling(14, min_periods=1).mean())
df["monthly_average"]         = df.groupby("caregiver_id")["requests"].shift(1).transform(lambda x: x.rolling(30, min_periods=1).mean())

# Drop rows with NaN (first row per caregiver has no previous_day_requests)
df.dropna(inplace=True)
df.reset_index(drop=True, inplace=True)

# Encode care_type and district as numeric codes for XGBoost
df["care_type_code"] = df["care_type"].astype("category").cat.codes
df["district_code"]  = df["district"].astype("category").cat.codes

df.to_csv("booking_dataset.csv", index=False)

print(f"Dataset generated: {len(df)} rows, {len(df.columns)} columns")
print(f"Caregivers: {NUM_CAREGIVERS}  |  Days per caregiver: {DAYS}")
print(f"\nColumns:\n{list(df.columns)}")
print(f"\nSample row:\n{df.iloc[0].to_dict()}")
