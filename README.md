# Body-Fat-Percentage-Measuring-Model-Assignment
================================================================================
  AuraFat.AI - BODY FAT PERCENTAGE PREDICTION SYSTEM
  Project History, Technologies and Work Log
================================================================================

Author : AI GROUP 15 (SYNTHEX6)
Project: Body Fat Percentage Measuring System (AuraFat.AI)
Type   : Course assignment (Neural Network + Classical Machine Learning)

--------------------------------------------------------------------------------
1. WHAT I SET OUT TO BUILD
--------------------------------------------------------------------------------

My goal was to build a system that predicts a person's body fat percentage
from simple measurements that anyone can take at home with a tape measure and
a scale - age, sex, weight, height and a few body circumferences - instead of
needing an expensive DXA scan or underwater weighing.

The assignment required a neural network, so I planned from the start to
build a PyTorch neural network and compare it against classical machine
learning models (Linear Regression and Random Forest) so I could show whether
the neural network was actually worth the extra effort.


--------------------------------------------------------------------------------
2. CHOOSING THE APPROACH (August 2026)
--------------------------------------------------------------------------------

I first looked at two possible routes:

  a) Image-based (photo -> body fat %) using computer vision
  b) Measurement-based / tabular (body measurements -> body fat %)

I chose the measurement-based route. Image-based models need large labelled
photo datasets that are hard to get publicly, and they are much heavier to
train. The tabular route had a strong public dataset available and is backed
by previous research (e.g. Ferenci & Kovacs 2018, who used neural networks on
NHANES data for the same problem).

At this stage I also wrote a full project proposal (Word document, IEEE
citations) covering the background, objectives, techniques, inputs/outputs,
tools, workflow diagram, work division and a 6-week timeline.

Data sources I reviewed:
  - NHANES DXA data (CDC / NCHS)              -> SELECTED as main training data
  - Kaggle "Body Fat Prediction Dataset"
    (252 men, Johnson 1996)                    -> kept for external validation
  - Kaggle Body Fat Extended / Women datasets -> reference only
  - Image datasets (ShapedNet, 3DPatBody etc) -> not used, reference only

Why NHANES: it is free, public, and the largest dataset where body fat % is
measured by a whole-body DXA scan (the clinical gold standard), together with
the body measurements I needed.


--------------------------------------------------------------------------------
3. TOOLS AND TECHNOLOGIES I USED
--------------------------------------------------------------------------------

  Environment     : Google Colab (cloud notebooks, free GPU/CPU)
  Storage         : Google Drive (mounted in Colab, because Colab's own disk
                    resets every session)
  Language        : Python
  Data handling   : pandas (reading NHANES .XPT SAS files, merging, cleaning)
  Classical ML    : scikit-learn (LinearRegression, RandomForestRegressor,
                    train_test_split, StandardScaler, metrics)
  Deep learning   : PyTorch (nn.Module, nn.Linear, ReLU, MSELoss, Adam)
  Visualisation   : matplotlib (train vs test loss curves)
  Model saving    : joblib (sklearn models + scaler), torch .pt (NN weights),
                    JSON (feature configuration)
  Web app         : AuraFat.AI frontend + Python server.py to serve the
                    trained neural network

My Google Drive folder structure:

  AI_Project_Body_Fat_Percentage_Mesuring/
  |-- Raw_Data/    DEMO_D.XPT, BMX_D.XPT, DXX_D.XPT
  |-- Processed/   clean_bodyfat_dataset.csv
  |-- Models/      bodyfat_model_full.joblib, bodyfat_model_reduced.joblib,
  |                bodyfat_nn.pt, nn_scaler.joblib, feature_config.json
  |-- Scripts/


--------------------------------------------------------------------------------
4. STAGE 1 - GETTING THE DATA
--------------------------------------------------------------------------------

I used the NHANES 2005-2006 cycle (cycle "D"). Three files were needed:

  DEMO_D.XPT  - Demographics (age, sex)                    10,348 rows
  BMX_D.XPT   - Body measurements (weight, height, waist)   9,950 rows
  DXX_D.XPT   - DXA scan results (body fat %)              34,465 rows

Problem I hit: the old CDC download links returned 404 errors because CDC had
restructured their website. The download "worked" but actually saved an HTML
error page, so pandas gave the error "Header record is not an XPORT file".
I found this by printing the first bytes of the file and seeing
"<!DOCTYPE html>". The working URL pattern was:

  https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2005/DataFiles/<FILE>.xpt

Lesson learned: always check what was actually downloaded.


--------------------------------------------------------------------------------
5. STAGE 2 - CLEANING AND PREPARING THE DATA
--------------------------------------------------------------------------------

Steps I followed:

  1. Loaded the three files with pd.read_sas(path, format='xport').

  2. The DXA file has 5 rows per person (34,465 = 6,893 people x 5), because
     CDC used multiple imputation for missing scan values. The marker column
     is called "_MULT_" (not "MULT" as I first assumed - this gave me a
     KeyError until I printed the real column names).

  3. Kept only valid completed scans (DXAEXSTS == 1) and averaged the 5 rows
     per person using groupby('SEQN').mean().
     -> 5,713 people with valid scans.

  4. Merged DXA + Demographics + Body Measurements on SEQN (person ID) with
     an inner join.

  5. Selected the final columns:
       SEQN      - person ID (dropped before training)
       RIDAGEYR  - age
       RIAGENDR  - sex
       BMXWT     - weight
       BMXHT     - height
       BMXBMI    - BMI
       BMXWAIST  - waist circumference
       BMXARMC   - arm circumference
       BMXCALF   - calf circumference
       BMXTHICR  - thigh circumference
       DXDTOPF   - total body fat % from DXA  (TARGET)

  6. Dropped rows with missing values (only 12-57 per column).
     -> FINAL CLEAN DATASET: 5,628 people, 11 columns.

  7. Saved as Processed/clean_bodyfat_dataset.csv so I never need to redo
     steps 1-6.

Features I deliberately left out:
  - Skinfold thickness (BMXTRI, BMXSUB) - needs special calipers
  - Upper arm / upper leg length (BMXARML, BMXLEG) - need exact bone
    landmarks and a rigid anthropometer; hard for normal users to measure
    accurately at home (still an open question for later)
  - Head / recumbent length - only for children
  - Race / ethnicity - sensitive attribute, left out on purpose


--------------------------------------------------------------------------------
6. STAGE 3 - CLASSICAL MACHINE LEARNING BASELINES
--------------------------------------------------------------------------------

Setup used for every model so results are comparable:
  - 80% training / 20% testing split
  - random_state = 42 (same split in every notebook)

6.1 Linear Regression
  - Simple baseline to see how far a straight-line model gets.
  - Result: MAE = 3.23, RMSE = 4.03, R2 = 0.804

6.2 Random Forest (9 features)
  - RandomForestRegressor(n_estimators=200, random_state=42)
  - No scaling and no tuning needed.
  - Result: MAE = 2.63, RMSE = 3.35, R2 = 0.865

6.3 Random Forest (reduced, 6 features)
  - Removed arm, calf and thigh circumference to test if fewer
    measurements would be easier for users.
  - Result: MAE = 2.69, RMSE = 3.41, R2 = 0.860
  - Only about 0.06 worse MAE than the full model - very small loss.

Feature importance (from the 9-feature Random Forest):
  Sex 0.343, BMI 0.329, Waist 0.156, Age 0.054, Height 0.052,
  Arm 0.017, Calf 0.017, Thigh 0.017, Weight 0.015

Sex and BMI are by far the most important, which makes sense physically -
men and women with the same BMI have very different body fat.

Decision: I kept the full 9-feature model as the main one, and saved the
reduced one as a simpler option for later.


--------------------------------------------------------------------------------
7. STAGE 4 - NEURAL NETWORK (PyTorch)
--------------------------------------------------------------------------------

I built the neural network in a separate Colab notebook, loading the same
CSV and using the same random_state = 42 split so it is tested on exactly
the same people as the Random Forest.

7.1 Preprocessing
  - StandardScaler fitted on the TRAINING data only, then applied to both
    train and test (so no information leaks from the test set).
  - Scaling was needed for the neural network (gradient descent is
    sensitive to feature scale), but not for Random Forest.

7.2 Training setup (same for all architectures)
  - Loss function : MSELoss
  - Optimizer     : Adam, learning rate = 0.001
  - Seed          : torch.manual_seed(42)

7.3 Architectures I tried

  a) 2 hidden layers
       Linear(9 -> 64) -> ReLU -> Linear(64 -> 32) -> ReLU -> Linear(32 -> 1)
     I kept the network small because I only had about 4,500 training rows,
     and a large network would overfit.

  b) 3 hidden layers with different node counts
       Layers / nodes tried : ______________________________
       Best result          : MAE = ____  RMSE = ____  R2 = ____
       Observation          : ______________________________

  (I also tried different node counts in the 2-layer version:
       Configurations tried : ______________________________ )

7.4 Choosing the number of epochs
  - Instead of guessing a fixed number, I recorded the loss every epoch and
    saved a checkpoint every time the evaluation loss reached a new lowest
    value. That way the best epoch is captured automatically.
  - From the train-vs-test loss plot (zoomed into epochs 1000-5000) I saw
    that the loss wobbles a bit (noise) for a long time, and real
    overfitting - where the test loss keeps rising steadily - only started
    around epoch 4700-4800. So small wobbles are not a reason to stop.
  - Final runs used 5000 epochs with best-epoch checkpointing.

7.5 Two bugs I found and fixed
  Bug 1 - No random seed:
    Every new model starts with random weights, so each run gave a
    different "best epoch" and different results (e.g. epoch 4364 ->
    MAE 2.68, then epoch 2693 -> MAE 2.74). Fixed with
    torch.manual_seed(42) before creating the model.

  Bug 2 - Checkpoint not really saved:
    best_model_state = model.state_dict() does NOT make a copy - it points
    to the live weights, which keep changing every epoch. So my "best"
    model was secretly the last (overfitted) model. Fixed with
    best_model_state = copy.deepcopy(model.state_dict()).

7.6 Training WITHOUT a separate validation set
  - In my first version I used the 20% test set to pick the best epoch
    (checkpoint whenever test loss was lowest).
  - Result (2-layer, seed 42, 5000 epochs):
      Best epoch 2685 -> MAE = 2.57, RMSE = 3.24, R2 = 0.874
  - Limitation: because the test set was used to choose the epoch, the
    test score is slightly optimistic - the test set is no longer
    completely "unseen".

7.7 Training WITH a separate validation set
  - To fix that, I split the training data again to create a validation
    set. The best epoch is chosen using validation loss only, and the test
    set is used just once at the very end for the final score.
  - Split used          : ______________________________
  - Best epoch          : ______
  - Result              : MAE = ____  RMSE = ____  R2 = ____
  - Comparison with the
    no-validation version: ______________________________

7.8 Saved files
  - bodyfat_nn.pt        - best neural network weights
  - nn_scaler.joblib     - the fitted StandardScaler (must be applied to new
                           inputs before predicting)


--------------------------------------------------------------------------------
8. FINAL RESULTS COMPARISON
--------------------------------------------------------------------------------

Same 80/20 test split for all (random_state = 42):

  Model                                   MAE    RMSE   R2
  -------------------------------------   ----   ----   -----
  Linear Regression                       3.23   4.03   0.804
  Random Forest (9 features)              2.63   3.35   0.865
  Random Forest (6 features, reduced)     2.69   3.41   0.860
  Neural Network 2-layer (no validation)  2.57   3.24   0.874
  Neural Network 3-layer                  ____   ____   _____
  Neural Network (with validation set)    ____   ____   _____

All models are within the expected accuracy for this kind of problem
(around +/- 3-4 body fat percentage points MAE vs DXA).

My conclusion: the neural network gave the best accuracy, but it needed much
more work to get a reliable result - feature scaling, thousands of epochs,
early stopping / checkpointing, a fixed seed, and fixing the state_dict bug.
The Random Forest got very close with zero tuning and was reproducible from
the start. So the neural network wins on accuracy, but Random Forest wins on
simplicity. This trade-off is an important result, not just the leaderboard.


--------------------------------------------------------------------------------
9. STAGE 5 - DEPLOYMENT: AuraFat.AI WEB APP
--------------------------------------------------------------------------------

  - Built the frontend for the AuraFat.AI web app where users enter their
    age, sex, weight, height and circumference measurements.
  - Wrote a Python server.py that loads the trained neural network
    (bodyfat_nn.pt) and the scaler (nn_scaler.joblib), scales the user's
    input the same way as during training, and returns the predicted body
    fat percentage to the frontend.


--------------------------------------------------------------------------------
10. LESSONS LEARNED
--------------------------------------------------------------------------------

  - Always check what you actually downloaded (the 404 HTML page problem).
  - Always print real column names instead of trusting documentation.
  - Use the same random split everywhere so model comparisons are fair.
  - Fit the scaler on training data only to avoid data leakage.
  - Fix random seeds, otherwise neural network results are not
    reproducible.
  - state_dict() is a reference, not a copy - use copy.deepcopy().
  - Do not use the test set to choose epochs; use a separate validation
    set so the final test score is honest.
  - A more complex model is not automatically better - accuracy has to be
    weighed against effort and reliability.


--------------------------------------------------------------------------------
11. FUTURE IMPROVEMENTS
--------------------------------------------------------------------------------

  - Add more NHANES cycles (1999-2006) to get a bigger training set.
  - Test the reduced 6-feature dataset on the neural network too.
  - Test adding upper arm / leg length back if the app can teach users to
    measure them correctly.
  - External validation on the Kaggle 252-man benchmark dataset.
  - Improve in-app measurement instructions to reduce user measuring error.


--------------------------------------------------------------------------------
REFERENCES
--------------------------------------------------------------------------------

[1] CDC / NCHS, "National Health and Nutrition Examination Survey (NHANES)
    - DXA data," https://wwwn.cdc.gov/nchs/nhanes/dxa/dxa.aspx
[2] R. W. Johnson, "Fitting percentage of body fat to simple body
    measurements," Journal of Statistics Education, vol. 4, no. 1, 1996.
[3] T. Ferenci and L. Kovacs, "Predicting body fat percentage from
    anthropometric and laboratory measurements using artificial neural
    networks," Applied Soft Computing, vol. 67, pp. 834-839, 2018.
[4] T. L. Kelly, K. E. Wilson, S. B. Heymsfield, "DXA body composition
    reference values from NHANES," PLoS ONE, vol. 4, no. 9, e7038, 2009.
[5] A. Paszke et al., "PyTorch: An imperative style, high-performance deep
    learning library," NeurIPS, 2019, pp. 8026-8037.
[6] F. Pedregosa et al., "Scikit-learn: Machine learning in Python," JMLR,
    vol. 12, pp. 2825-2830, 2011.

================================================================================
