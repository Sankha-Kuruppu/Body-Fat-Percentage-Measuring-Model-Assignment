AuraFat.AI - Body Fat Percentage Estimator
==========================================

A web app that estimates body fat percentage from body measurements using a
PyTorch neural network (BodyFatNet) trained on NHANES 2005-2006 DXA data.


PROJECT FILES
-------------
  server.py          Python web server + neural network prediction API
  index.html         The web page
  app.js             Front-end logic (form, unit switching, results gauge)
  styles.css         Page styling
  assets/images/     Measurement guide images
  bodyfat_nn_final.pt     Trained neural network weights
  nn_scaler_final.joblib  StandardScaler fitted on the training data

  bodyfat_nn_final.pt and nn_scaler_final.joblib MUST stay in the same folder as server.py.


REQUIREMENTS
------------
  - Python 3.12 (64-bit)
  - Packages: torch, pandas, scikit-learn, joblib

  This computer has several Python versions (3.10, 3.12, 3.14).
  Use Python 3.12 - it already has all the packages installed.
  Plain "pip install torch" goes to Python 3.14 and fails with
  "No matching distribution found for torch".

  To install packages into the right Python (only if ever needed):
      py -3.12 -m pip install torch pandas scikit-learn joblib


HOW TO START
------------
  1. Open a terminal in the project folder
     (in VS Code: Terminal -> New Terminal).

  2. Run:
         py -3.12 server.py

  3. You should see:
         [+] AuraFat.AI Web Application & NN Server running on http://localhost:8000

  4. Open a browser and go to:
         http://localhost:8000

  5. Enter the measurements and the neural network calculates the result.

  6. To stop the server, press Ctrl+C in the terminal.

  NOTE: Do NOT open index.html by double-clicking it. The page will load, but it
  cannot reach the neural network and silently falls back to a simpler formula.
  Always use http://localhost:8000.


INPUTS THE MODEL USES
---------------------
  age, sex (male/female), weight, height, waist, upper arm, calf, thigh
  BMI is calculated automatically from weight and height.

  UNITS: the model only understands kg and cm (that is what NHANES uses).
  Each measurement card has its own unit switch, so units can be mixed
  (e.g. height in ft + in, waist in inches, calf and thigh in cm):
      Weight:          kg | lbs
      Height:          cm | ft + in | in
      Waist, arm, calf, thigh:  cm | in
  The "Metric / Imperial" toggle at the top is a shortcut that switches every
  card at once (neither is highlighted when the units are mixed).
  app.js converts every value to kg/cm (readMetricInputs) before sending it to
  the model, so the model always gets the right units. Fat / lean mass in the
  results are shown in the unit chosen for body weight.

  Realistic-range check (in kg/cm), done on both the page and the server, to
  catch unit mix-ups such as typing height in feet into the cm box:
      weight 30-300 kg, height 100-250 cm, waist 40-200 cm,
      upper arm 15-80 cm, calf 15-80 cm, thigh 20-120 cm
  These limits are in two places - METRIC_LIMITS in app.js and server.py -
  keep them the same if you change them.


API (for testing / other apps)
------------------------------
  POST http://localhost:8000/api/predict
  Content-Type: application/json

  Example request:
    {"age": 30, "sex": "male", "weight": 80, "height": 178, "waist": 90,
     "upper_arm": 33, "calf": 38, "thigh": 55, "unit": "metric"}

  Example response:
    {"status": "success", "model_version": "BodyFatNet_NHANES_9feat_final",
     "body_fat_percentage": 24.1, "bmi": 25.2, "parameters_received": {...}}

  Also accepted: "gender" instead of "sex", "arm" instead of "upper_arm".
  All measurements must be positive numbers; unit must be "metric" or "imperial".
  With "imperial", weight is in lbs and every length (including height) is in
  inches; the server converts to kg/cm and then applies the range check.
  Missing or invalid fields return status 400 with an error message.


KNOWN MESSAGES / TROUBLESHOOTING
--------------------------------
  InconsistentVersionWarning (StandardScaler from version 1.6.1 ...)
      Shown at startup. Safe to ignore - the scaler only stores means and
      standard deviations. To remove it: py -3.12 -m pip install scikit-learn==1.6.1

  OSError: [WinError 10048] Only one usage of each socket address ...
      Port 8000 is already in use - the server is probably already running in
      another terminal. Close that one, or change PORT = 8000 at the top of
      server.py (e.g. to 8080) and open http://localhost:8080 instead.

  No matching distribution found for torch
      You are using the wrong Python (3.14). Use "py -3.12" as shown above.


CHANGES MADE TO server.py (2026-10-05)
--------------------------------------
  - Rejects zero, negative, NaN or infinite measurements (height 0 used to crash
    with "float division by zero").
  - Rejects unknown "unit" values instead of silently treating them as metric.
  - Loads the model with torch.load(..., weights_only=True) for safety.
  - Uses a threaded server so one slow connection cannot block others.

UNIT HANDLING CHANGES (2026-10-05)
----------------------------------
  - Height in imperial mode is now entered as feet + inches (two boxes).
  - The page converts all inputs to kg/cm before calling the model; the
    fallback formula and BMI/fat-mass display use the same converted values.
  - Input min/max limits switch with the selected unit.
  - Out-of-range values (unit mix-ups) are rejected with a clear message on
    both the page and the server.
  - If the server rejects the input, the page now shows the error instead of
    silently switching to the fallback formula.

PER-PARAMETER UNITS (2026-10-05)
--------------------------------
  - Every measurement card has its own unit switch; units can be mixed.
  - The top Metric / Imperial toggle now sets all cards at once.
  - Out-of-range warnings show the expected range in the unit you picked.

MEASUREMENT GUIDE ALIGNED WITH NHANES (2026-10-07)
--------------------------------------------------
  The measuring instructions and guide images now follow the CDC NHANES
  2005-2006 Anthropometry Procedures Manual (section 3.3.1), i.e. the way
  the model's training data were measured:
  https://wwwn.cdc.gov/nchs/data/nhanes/public/2005/manuals/BM.pdf
  - Waist: just above the top of the right hip bone (iliac crest), NOT the navel.
  - Upper arm: midpoint between shoulder tip (acromion) and elbow tip
    (olecranon), arm relaxed - NOT the biggest part of the biceps.
  - Calf: seated, knee at 90 degrees, widest point.
  - Thigh: midpoint of inguinal crease to top of kneecap (marked seated),
    measured standing with weight on the other leg.
  - Height: barefoot, heels together, Frankfort plane, deep breath.
  New images (assets/images/guide-*.png) are restyled NHANES figures
  (US government work, public domain). chest.jpg, hip.jpg, neck.jpg,
  waist.jpg, height.jpg and thigh.jpg are no longer used by the page.

MODEL CLAIMS CORRECTED (2026-10-07)
-----------------------------------
  The page now describes the real model: 9 features (8 inputs + BMI),
  two hidden layers (64 -> 32 -> 1, ReLU), test-set R^2 = 0.874, trained on
  NHANES 2005-2006 DXA body fat. Removed the unsupported "99.4% accuracy",
  "clinical-grade", "4 layers + batch normalization", "< 1.5s" and
  TensorFlow/.h5/.pkl claims, and the made-up loading-step descriptions.

USER-FACING TEXT SIMPLIFIED (2026-10-07)
----------------------------------------
  - The page no longer names the training dataset (NHANES / CDC / DXA);
    it is only mentioned in code comments and in this README.
  - Accuracy is shown as "87.7%" (the model's R^2 on test data) in two places
    only: the top stats and under the result meter.
  - Removed technical detail users don't need (feature counts, scaler,
    file names, layer sizes, sex coding, anatomical jargon).
  - Guide images no longer carry a source caption.
