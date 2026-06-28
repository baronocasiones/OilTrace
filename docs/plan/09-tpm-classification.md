# 09 — TPM Classification Engine (SAF vs Biofuel)

## Overview

Total Polar Materials (TPM) measures the degradation of cooking oil during frying. As oil is reused, chemical compounds form (polar materials) that make it unsuitable for cooking. The higher the TPM, the more degraded the oil.

OilTrace reads the TPM value from the IoT sensor, classifies the oil by grade, and determines its optimal end-use destination.

## Grading Logic

```python
def classify_oil(tpm_value: float) -> dict:
    """
    Classify used cooking oil by TPM value.
    
    Args:
        tpm_value: Total Polar Materials as percentage (0.0 - 40.0)
        
    Returns:
        dict with grade, destination, and description
    """
    if tpm_value < 20.0:
        return {
            "grade": "premium",
            "destination": "SAF",
            "description": "High quality — suitable for Sustainable Aviation Fuel production",
            "color": "green"
        }
    elif tpm_value <= 30.0:
        return {
            "grade": "standard",
            "destination": "blended",
            "description": "Medium quality — suitable as blended feedstock",
            "color": "yellow"
        }
    else:
        return {
            "grade": "low",
            "destination": "biofuel",
            "description": "Low quality — suitable for local biodiesel production",
            "color": "red"
        }
```

## Classification Table

| Grade | TPM Range | Destination | Est. Value/Liter | Color Code |
|-------|-----------|-------------|-----------------|------------|
| **Premium** | < 20% | Sustainable Aviation Fuel (SAF) | ₱35-50/L | 🟢 Green |
| **Standard** | 20-30% | Blended feedstock | ₱20-35/L | 🟡 Yellow |
| **Low** | > 30% | Local Biofuel (Biodiesel) | ₱15-20/L | 🔴 Red |

## Business Logic Flow

```
ESP32 sends TPM = 24.5
        │
        ▼
FastAPI Classification Engine:
  Input: tpm_value = 24.5
  Decision: 20 <= 24.5 <= 30 → grade = "standard"
  Destination: "blended"
        │
        ▼
1. Store in `collections` table:
   tpm_value: 24.5
   oil_grade: "standard"
   oil_destination: "blended"

2. Write to smart contract:
   tpmValue: 2450    (×100 for integer storage)
   grade: 1          (0=Premium, 1=Standard, 2=Low)

3. Award points:
   points = volume_liters * partner.points_per_liter
   (e.g., 5L × 10 pts/L = 50 points)
```

## Why Grade Matters

### Premium (TPM < 20%) → Sustainable Aviation Fuel

- **What:** Oil that has been used minimally (1-2 frying cycles)
- **Why it's valuable:** SAF requires high-quality feedstock with low impurities. The HEFA (Hydroprocessed Esters and Fatty Acids) process used for SAF production works best with clean, low-TPM oils.
- **Market:** International demand from airlines (EU mandates SAF blending from 2025+)
- **Estimated price:** ~$800-1,200/ton (~₱35-50/L)

### Standard (TPM 20-30%) → Blended Feedstock

- **What:** Moderately used oil
- **Why:** Can be blended with premium oil for SAF, or used directly for lower-grade biofuel
- **Market:** Flexible — sold to whichever buyer offers best price
- **Estimated price:** ~$400-800/ton (~₱20-35/L)

### Low (TPM > 30%) → Local Biofuel

- **What:** Heavily used oil (approaching the 40% limit where PH health regulations require disposal)
- **Why it's still useful:** Biodiesel production (transesterification) can handle lower-quality feedstock
- **Market:** Local Philippine biodiesel plants (government mandates 2-5% biodiesel blend in diesel)
- **Estimated price:** ~$200-400/ton (~₱15-20/L)

## Health & Safety Context

In the Philippines, the **Food and Drug Administration (FDA)** and **local health ordinances** require eateries to dispose of oil when TPM exceeds:
- **25%** — recommended replacement point
- **30%+** — mandatory for health compliance

This means:
- Karinderyas *must* change oil regularly
- OilTrace provides a legitimate disposal channel
- Points incentive makes compliance attractive rather than burdensome
- Blockhain traceability proves to LGUs that oil was properly disposed

## Estimated Revenue Model (Per 1,000L Collected)

| Grade | Volume (est.) | Price/L | Total Revenue |
|-------|--------------|---------|--------------|
| Premium (40%) | 400L | ₱40/L | ₱16,000 |
| Standard (35%) | 350L | ₱25/L | ₱8,750 |
| Low (25%) | 250L | ₱15/L | ₱3,750 |
| **Total** | **1,000L** | | **₱28,500** |

After costs (driver, logistics, points): **~₱9,000-12,000 profit per 1,000L**
