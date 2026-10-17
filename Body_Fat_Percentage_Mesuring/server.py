#!/usr/bin/env python3
"""
AuraFat.AI - Web Server & Neural Network Model Integration Bridge
Serves the Web UI on http://localhost:8000 and provides an API endpoint `/api/predict`
that runs the trained PyTorch neural network (BodyFatNet, trained on NHANES 2005-2006 DXA data).

Files that must sit in the same folder as this script:
  - bodyfat_nn_final.pt        (trained network weights)
  - nn_scaler_final.joblib     (StandardScaler fitted on the training data)
"""

import http.server
import socketserver
import json
import math
import os

# pyrefly: ignore [missing-import]
import joblib
import pandas as pd
import torch
import torch.nn as nn

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# =============================================================
# 1. MODEL DEFINITION - must be IDENTICAL to the class used in Colab
# =============================================================
class BodyFatNet(nn.Module):
    def __init__(self, n_features=9):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_features, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x):
        return self.net(x)


# Same order the model was trained on (CSV column order after dropping SEQN)
FEATURES = ["RIDAGEYR", "RIAGENDR", "BMXWT", "BMXHT", "BMXBMI",
            "BMXWAIST", "BMXARMC", "BMXCALF", "BMXTHICR"]

REQUIRED_FIELDS = ["age", "sex", "weight", "height", "waist", "calf", "thigh"]

# Plausible human ranges in model units (weight kg, lengths cm). Same limits as app.js.
METRIC_LIMITS = {"weight": (30, 300), "height": (100, 250), "waist": (40, 200),
                 "upper_arm": (15, 80), "calf": (15, 80), "thigh": (20, 120)}

# =============================================================
# 2. LOAD MODEL + SCALER ONCE, WHEN THE SERVER STARTS
# =============================================================
MODEL_PATH = os.path.join(DIRECTORY, "bodyfat_nn_final.pt")
SCALER_PATH = os.path.join(DIRECTORY, "nn_scaler_final.joblib")

scaler = joblib.load(SCALER_PATH)

model = BodyFatNet(n_features=len(FEATURES))
model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu", weights_only=True))
model.eval()  # switch to prediction mode


def predict_bodyfat(age, sex_code, weight_kg, height_cm, waist_cm, arm_cm, calf_cm, thigh_cm):
    """Takes metric measurements, returns (body_fat_percent, bmi)."""
    bmi = weight_kg / ((height_cm / 100.0) ** 2)

    row = pd.DataFrame([[age, sex_code, weight_kg, height_cm, bmi,
                         waist_cm, arm_cm, calf_cm, thigh_cm]], columns=FEATURES)

    scaled = scaler.transform(row)                       # same scaling as training
    x = torch.tensor(scaled, dtype=torch.float32)

    with torch.no_grad():                                # no training, just predict
        fat = model(x).item()

    return round(fat, 1), round(bmi, 1)


class NeuralNetRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))

    def do_POST(self):
        if self.path != '/api/predict':
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode('utf-8'))

            # Accept "gender" as an alias for "sex", and "arm" for "upper_arm"
            if 'sex' not in data and 'gender' in data:
                data['sex'] = data['gender']
            upper_arm_value = data.get('upper_arm', data.get('arm'))

            # Refuse to predict if anything is missing (no silent default values)
            missing = [f for f in REQUIRED_FIELDS if data.get(f) in (None, "")]
            if upper_arm_value in (None, ""):
                missing.append("upper_arm")
            if missing:
                self.send_json(400, {"status": "error",
                                     "message": f"Missing fields: {', '.join(missing)}"})
                return

            age = float(data['age'])
            sex = str(data['sex']).lower()
            weight = float(data['weight'])
            height = float(data['height'])
            waist = float(data['waist'])
            upper_arm = float(upper_arm_value)
            calf = float(data['calf'])
            thigh = float(data['thigh'])
            unit = data.get('unit', 'metric')

            # Reject zero, negative, NaN or infinite values (avoids division by zero / invalid JSON)
            numbers = {"age": age, "weight": weight, "height": height, "waist": waist,
                       "upper_arm": upper_arm, "calf": calf, "thigh": thigh}
            invalid = [k for k, v in numbers.items() if not math.isfinite(v) or v <= 0]
            if invalid:
                self.send_json(400, {"status": "error",
                                     "message": f"Fields must be positive numbers: {', '.join(invalid)}"})
                return

            if unit not in ('metric', 'imperial'):
                self.send_json(400, {"status": "error",
                                     "message": "unit must be 'metric' or 'imperial'"})
                return

            # NHANES coding: 1 = male, 2 = female
            if sex in ['male', 'm']:
                sex_code = 1
            elif sex in ['female', 'f']:
                sex_code = 2
            else:
                self.send_json(400, {"status": "error",
                                     "message": "sex must be 'male' or 'female'"})
                return

            # Unit conversion to metric (the model was trained on kg and cm)
            if unit == 'imperial':
                weight_kg = weight * 0.453592
                height_cm = height * 2.54
                waist_cm = waist * 2.54
                arm_cm = upper_arm * 2.54
                calf_cm = calf * 2.54
                thigh_cm = thigh * 2.54
            else:
                weight_kg, height_cm = weight, height
                waist_cm, arm_cm, calf_cm, thigh_cm = waist, upper_arm, calf, thigh

            # Sanity-check the converted values to catch unit mix-ups
            # (e.g. height sent in feet or inches while unit says metric)
            converted = {"weight": weight_kg, "height": height_cm, "waist": waist_cm,
                         "upper_arm": arm_cm, "calf": calf_cm, "thigh": thigh_cm}
            out_of_range = [f"{k} {v:.1f} (expected {METRIC_LIMITS[k][0]}-{METRIC_LIMITS[k][1]} "
                            f"{'kg' if k == 'weight' else 'cm'})"
                            for k, v in converted.items()
                            if not METRIC_LIMITS[k][0] <= v <= METRIC_LIMITS[k][1]]
            if out_of_range:
                self.send_json(400, {"status": "error",
                                     "message": "Values out of realistic range after converting to kg/cm - "
                                                "check the unit: " + "; ".join(out_of_range)})
                return

            # =============================================================
            # 3. REAL NEURAL NETWORK PREDICTION
            # =============================================================
            fat_percentage, bmi = predict_bodyfat(age, sex_code, weight_kg, height_cm,
                                                  waist_cm, arm_cm, calf_cm, thigh_cm)

            self.send_json(200, {
                "status": "success",
                "model_version": "BodyFatNet_NHANES_9feat_final",
                "body_fat_percentage": fat_percentage,
                "bmi": bmi,
                "parameters_received": {
                    "age": age,
                    "sex": sex,
                    "weight": weight,
                    "height": height,
                    "waist": waist,
                    "upper_arm": upper_arm,
                    "calf": calf,
                    "thigh": thigh,
                    "unit": unit
                }
            })

        except Exception as e:
            self.send_json(400, {"status": "error", "message": str(e)})

    def do_OPTIONS(self):
        # Handle CORS Preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


def run_server():
    os.chdir(DIRECTORY)
    with socketserver.ThreadingTCPServer(("", PORT), NeuralNetRequestHandler) as httpd:
        print(f"[+] AuraFat.AI Web Application & NN Server running on http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    run_server()