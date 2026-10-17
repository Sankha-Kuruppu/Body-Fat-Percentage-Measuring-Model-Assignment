/**
 * AuraFat.AI - Body Fat Percentage NN Calculator & Gauge Renderer
 * Frontend Application Script
 */

// ==========================================================================
// 1. Parameter Guide Knowledge Base (Easily editable by user)
// ==========================================================================
// Measuring instructions follow the CDC NHANES 2005-2006 Anthropometry Procedures
// Manual (section 3.3.1) - the same protocol used to measure the model's training data.
// fit: 'contain' shows the whole diagram instead of cropping it.
const GUIDE_DATABASE = {
  age: {
    title: "Age (Years)",
    badge: "Parameter 1 Guide",
    image: "assets/images/guide-age.png",
    fit: "contain",
    desc: "Your age in completed years. At the same body size, body fat tends to change with age, so the model uses age alongside your measurements.",
    tips: [
      "Enter your age in whole completed years - do not round up.",
      "Use your age on the day you take the measurements."
    ]
  },
  sex: {
    title: "Biological Sex",
    badge: "Parameter 2 Guide",
    image: "assets/images/guide-sex.png",
    fit: "contain",
    desc: "At the same body measurements, women on average carry more body fat than men, so the model needs this to estimate correctly.",
    tips: [
      "Select the option that matches your biological sex (male or female)."
    ]
  },
  weight: {
    title: "Body Weight",
    badge: "Parameter 3 Guide",
    image: "assets/images/weight.jpg",
    desc: "Body weight on a digital floor scale, without shoes, wearing only light clothing.",
    tips: [
      "Remove shoes and heavy clothing - wear only light underclothes.",
      "Place the scale on a hard, flat floor (not carpet).",
      "Stand still in the centre of the scale, hands at your sides, looking straight ahead, and read it once the display is stable.",
      "For repeat checks, weigh at the same time of day, e.g. in the morning after using the bathroom."
    ]
  },
  height: {
    title: "Standing Height",
    badge: "Parameter 4 Guide",
    image: "assets/images/guide-height.png",
    fit: "contain",
    desc: "Maximum standing height, barefoot, measured against a wall or stadiometer.",
    tips: [
      "Remove shoes and anything on top of your head (hair ties, buns, clips).",
      "Stand on a hard floor with heels together, toes pointed slightly outward and feet flat.",
      "Heels, buttocks, shoulder blades and back of the head touch the wall. If they cannot all touch, keep your trunk upright with shoulders relaxed.",
      "Look straight ahead with your head level, not tilted up or down.",
      "Take a deep breath and stand as tall as possible. A helper presses a flat object (book or set square) onto the top of the head, against the wall, and reads to the nearest 0.1 cm."
    ]
  },
  waist: {
    title: "Waist Circumference",
    badge: "Parameter 5 Guide",
    image: "assets/images/guide-waist.png",
    fit: "contain",
    desc: "Measured around the trunk just above the top of the right hip bone. Do not measure at the belly button - that gives a different number.",
    tips: [
      "Stand upright and move clothing so the tape is on bare skin.",
      "Press along your right side to find the top of the hip bone. The tape goes just above its highest point, at the side of the body (in line with the armpit).",
      "Keep the tape horizontal - parallel to the floor all the way around. A mirror helps.",
      "Tape snug but not pressing into the skin. Read at the end of a normal breath out, without pulling the stomach in."
    ]
  },
  arm: {
    title: "Mid-Upper Arm Circumference",
    badge: "Parameter 6 Guide",
    image: "assets/images/guide-arm.png",
    fit: "contain",
    desc: "Right arm, at the midpoint between the bony tip of the shoulder and the tip of the elbow. This is not the biggest part of the biceps.",
    tips: [
      "Bend the right elbow to 90 degrees with the palm facing up.",
      "Measure down the back of the arm from the bony tip of the shoulder to the tip of the elbow, and mark the halfway point.",
      "Let the arm hang loosely at your side with the muscles relaxed - do not flex.",
      "Wrap the tape around the arm at the mark, perpendicular to the arm, snug without squeezing the skin. A helper makes this much more accurate."
    ]
  },
  calf: {
    title: "Maximal Calf Circumference",
    badge: "Parameter 7 Guide",
    image: "assets/images/guide-calf.png",
    fit: "contain",
    desc: "The largest circumference of the right calf, measured while sitting with the knee bent at 90 degrees.",
    tips: [
      "Sit on a chair or box with the right knee bent at a right angle and the leg relaxed.",
      "Wrap the tape around the calf and slide it up and down to find the widest point.",
      "Keep the tape perpendicular to the lower leg, snug but not tight."
    ]
  },
  thigh: {
    title: "Mid-Thigh Circumference",
    badge: "Parameter 8 Guide",
    image: "assets/images/guide-thigh.png",
    fit: "contain",
    desc: "Right thigh, at the midpoint between the crease where the front of the thigh meets the hip and the top edge of the kneecap. The point is marked sitting, then measured standing.",
    tips: [
      "Sit with the right knee bent at 90 degrees. Measure down the front of the thigh from the hip crease to the top edge of the kneecap, and mark halfway.",
      "Stand with most of your weight on the left leg, the right leg slightly forward, knee slightly bent, both feet flat. Hold something for balance.",
      "Wrap the tape around the thigh at the mark, perpendicular to the thigh, firm on the skin but not compressing it."
    ]
  }
};

// ==========================================================================
// 2. Application State
// ==========================================================================
const state = {
  gender: 'male', // 'male' | 'female'
  // units: per-parameter units (state.units), set up in section 4
  apiEndpoint: '/api/predict' // Backend Neural Network endpoint URL
};

// DOM References
const elements = {
  // Toggles
  genderMaleBtn: document.getElementById('genderMaleBtn'),
  genderFemaleBtn: document.getElementById('genderFemaleBtn'),
  sexCardMaleBtn: document.getElementById('sexCardMaleBtn'),
  sexCardFemaleBtn: document.getElementById('sexCardFemaleBtn'),
  unitMetricBtn: document.getElementById('unitMetricBtn'),
  unitImperialBtn: document.getElementById('unitImperialBtn'),
  presetSampleBtn: document.getElementById('presetSampleBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  mobileMenuToggle: document.getElementById('mobileMenuToggle'),
  navLinks: document.getElementById('navLinks'),

  // Form & Inputs (8 Parameters)
  bodyFatForm: document.getElementById('bodyFatForm'),
  processNNBtn: document.getElementById('processNNBtn'),
  inputAge: document.getElementById('inputAge'),
  inputWeight: document.getElementById('inputWeight'),
  inputHeight: document.getElementById('inputHeight'),
  inputHeightFt: document.getElementById('inputHeightFt'),
  inputHeightIn: document.getElementById('inputHeightIn'),
  heightMetricWrap: document.getElementById('heightMetricWrap'),
  heightImperialWrap: document.getElementById('heightImperialWrap'),
  inputWaist: document.getElementById('inputWaist'),
  inputArm: document.getElementById('inputArm'),
  inputCalf: document.getElementById('inputCalf'),
  inputThigh: document.getElementById('inputThigh'),

  // Meter Card States
  meterInitialState: document.getElementById('meterInitialState'),
  meterProcessingState: document.getElementById('meterProcessingState'),
  meterResultsState: document.getElementById('meterResultsState'),

  // Processing Animation elements
  loaderPercentage: document.getElementById('loaderPercentage'),
  processingStatusText: document.getElementById('processingStatusText'),
  progressBarFill: document.getElementById('progressBarFill'),
  logStep1: document.getElementById('logStep1'),
  logStep2: document.getElementById('logStep2'),
  logStep3: document.getElementById('logStep3'),
  logStep4: document.getElementById('logStep4'),

  // Results Gauge elements
  gaugeNeedleGroup: document.getElementById('gaugeNeedleGroup'),
  resultFatPercent: document.getElementById('resultFatPercent'),
  resultCategoryBadge: document.getElementById('resultCategoryBadge'),
  resultCategoryText: document.getElementById('resultCategoryText'),
  resultFatMass: document.getElementById('resultFatMass'),
  resultLeanMass: document.getElementById('resultLeanMass'),
  resultBMI: document.getElementById('resultBMI'),
  resultHealthyRange: document.getElementById('resultHealthyRange'),
  resultInsightDesc: document.getElementById('resultInsightDesc'),
  resultTimestamp: document.getElementById('resultTimestamp'),
  recalculateBtn: document.getElementById('recalculateBtn'),

  // Modal elements
  guideModalBackdrop: document.getElementById('guideModalBackdrop'),
  modalImg: document.getElementById('modalImg'),
  modalBadge: document.getElementById('modalBadge'),
  modalTitle: document.getElementById('modalTitle'),
  modalDesc: document.getElementById('modalDesc'),
  modalTipsList: document.getElementById('modalTipsList')
};

// ==========================================================================
// 3. Event Listeners Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  buildUnitSwitches();
  initEventListeners();
  updateFormUnitsUI();
});

function initEventListeners() {
  // Gender Toggle
  if (elements.genderMaleBtn) elements.genderMaleBtn.addEventListener('click', () => setGender('male'));
  if (elements.genderFemaleBtn) elements.genderFemaleBtn.addEventListener('click', () => setGender('female'));

  // Unit System Toggle
  elements.unitMetricBtn.addEventListener('click', () => setUnit('metric'));
  elements.unitImperialBtn.addEventListener('click', () => setUnit('imperial'));

  // Preset Sample Data
  elements.presetSampleBtn.addEventListener('click', loadSampleData);

  // Process NN Button
  elements.processNNBtn.addEventListener('click', runNNInferenceSequence);
  elements.recalculateBtn.addEventListener('click', showInitialState);

  // Theme Toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Mobile Menu Hamburger Toggle
  if (elements.mobileMenuToggle) {
    elements.mobileMenuToggle.addEventListener('click', toggleMobileMenu);
  }
}

function toggleMobileMenu() {
  if (!elements.navLinks) return;
  const isOpen = elements.navLinks.classList.toggle('mobile-open');
  const icon = elements.mobileMenuToggle.querySelector('i');
  if (icon) {
    icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  }
}

function closeMobileMenu() {
  if (elements.navLinks && elements.navLinks.classList.contains('mobile-open')) {
    elements.navLinks.classList.remove('mobile-open');
    const icon = elements.mobileMenuToggle.querySelector('i');
    if (icon) {
      icon.className = 'fa-solid fa-bars';
    }
  }
}

// ==========================================================================
// 4. State & UI Handlers
// ==========================================================================
function setGender(selectedGender) {
  state.gender = selectedGender;
  if (selectedGender === 'male') {
    if (elements.genderMaleBtn) elements.genderMaleBtn.classList.add('active');
    if (elements.genderFemaleBtn) elements.genderFemaleBtn.classList.remove('active');
    if (elements.sexCardMaleBtn) elements.sexCardMaleBtn.classList.add('active');
    if (elements.sexCardFemaleBtn) elements.sexCardFemaleBtn.classList.remove('active');
  } else {
    if (elements.genderFemaleBtn) elements.genderFemaleBtn.classList.add('active');
    if (elements.genderMaleBtn) elements.genderMaleBtn.classList.remove('active');
    if (elements.sexCardFemaleBtn) elements.sexCardFemaleBtn.classList.add('active');
    if (elements.sexCardMaleBtn) elements.sexCardMaleBtn.classList.remove('active');
  }
}

// --------------------------------------------------------------------------
// Units: the neural network was trained on NHANES data in kg and cm.
// Each measurement has its own unit (e.g. height in ft + in, waist in cm).
// readMetricInputs() converts every value to kg / cm before it is sent to the
// model or used anywhere else.
// --------------------------------------------------------------------------
const KG_PER_LB = 0.453592;
const CM_PER_IN = 2.54;

// Per-parameter unit options. factor = model units (kg / cm) per 1 display unit.
// 'ft_in' is height only and uses the separate feet + inches boxes.
const PARAM_UNITS = {
  weight:    { input: 'inputWeight', card: 'param-card-weight', metric: 'kg', imperial: 'lbs',
               options: { kg: 1, lbs: KG_PER_LB } },
  height:    { input: 'inputHeight', card: 'param-card-height', metric: 'cm', imperial: 'ft_in',
               options: { cm: 1, ft_in: null, in: CM_PER_IN } },
  waist:     { input: 'inputWaist', card: 'param-card-waist', metric: 'cm', imperial: 'in',
               options: { cm: 1, in: CM_PER_IN } },
  upper_arm: { input: 'inputArm', card: 'param-card-arm', metric: 'cm', imperial: 'in',
               options: { cm: 1, in: CM_PER_IN } },
  calf:      { input: 'inputCalf', card: 'param-card-calf', metric: 'cm', imperial: 'in',
               options: { cm: 1, in: CM_PER_IN } },
  thigh:     { input: 'inputThigh', card: 'param-card-thigh', metric: 'cm', imperial: 'in',
               options: { cm: 1, in: CM_PER_IN } }
};
const UNIT_LABELS = { kg: 'kg', lbs: 'lbs', cm: 'cm', in: 'in', ft_in: 'ft + in' };

// Plausible human ranges in model units (kg / cm). Same limits as server.py.
const METRIC_LIMITS = {
  weight:    { min: 30,  max: 300, unit: 'kg', label: 'Weight' },
  height:    { min: 100, max: 250, unit: 'cm', label: 'Height' },
  waist:     { min: 40,  max: 200, unit: 'cm', label: 'Waist' },
  upper_arm: { min: 15,  max: 80,  unit: 'cm', label: 'Upper arm' },
  calf:      { min: 15,  max: 80,  unit: 'cm', label: 'Calf' },
  thigh:     { min: 20,  max: 120, unit: 'cm', label: 'Thigh' }
};

// Current unit of each parameter (starts all metric)
state.units = Object.fromEntries(Object.entries(PARAM_UNITS).map(([key, cfg]) => [key, cfg.metric]));

// cm -> 5'10"
function formatFtIn(cm) {
  const totalIn = Math.round(cm / CM_PER_IN);
  return `${Math.floor(totalIn / 12)}'${totalIn % 12}"`;
}

// "Height: expected 100-250 cm (3'3"-8'2")" - adds the range in the unit the user picked
function formatLimit(key) {
  const lim = METRIC_LIMITS[key];
  const unit = state.units[key];
  let text = `${lim.label}: expected ${lim.min}-${lim.max} ${lim.unit}`;
  if (unit === 'ft_in') {
    text += ` (${formatFtIn(lim.min)}-${formatFtIn(lim.max)})`;
  } else if (unit !== lim.unit) {
    const f = PARAM_UNITS[key].options[unit];
    text += ` (${Math.round(lim.min / f)}-${Math.round(lim.max / f)} ${UNIT_LABELS[unit]})`;
  }
  return text;
}

// Value of one parameter in model units (kg / cm), read in the given unit. NaN if empty.
function readParamMetric(key, unit = state.units[key]) {
  if (unit === 'ft_in') {
    const ft = parseFloat(elements.inputHeightFt.value);
    const inch = parseFloat(elements.inputHeightIn.value) || 0;   // empty inches = 0
    if (isNaN(ft)) return NaN;
    return (ft * 12 + inch) * CM_PER_IN;
  }
  return parseFloat(elements[PARAM_UNITS[key].input].value) * PARAM_UNITS[key].options[unit];
}

// Fill one parameter's box(es) from a value in model units, shown in the given unit
function writeParamMetric(key, metricValue, unit = state.units[key]) {
  if (unit === 'ft_in') {
    const totalIn = metricValue / CM_PER_IN;
    let ft = Math.floor(totalIn / 12);
    let inch = Math.round((totalIn - ft * 12) * 2) / 2;   // nearest 0.5 in
    if (inch >= 12) { ft += 1; inch -= 12; }
    elements.inputHeightFt.value = ft;
    elements.inputHeightIn.value = inch;
    return;
  }
  elements[PARAM_UNITS[key].input].value = (metricValue / PARAM_UNITS[key].options[unit]).toFixed(1);
}

// All measurements converted to model units: weight kg, lengths cm
function readMetricInputs() {
  const values = {
    age: parseFloat(elements.inputAge.value),
    sex: state.gender
  };
  Object.keys(PARAM_UNITS).forEach(key => {
    values[key] = readParamMetric(key);
  });
  return values;
}

// Change the unit of one parameter, converting whatever is already typed in
function setParamUnit(key, unit) {
  const prevUnit = state.units[key];
  if (prevUnit === unit) return;
  const value = readParamMetric(key, prevUnit);
  state.units[key] = unit;
  if (!isNaN(value)) writeParamMetric(key, value, unit);
  updateFormUnitsUI();
}

// Top "Metric / Imperial" toggle: shortcut that switches every parameter at once
function setUnit(system) {
  Object.entries(PARAM_UNITS).forEach(([key, cfg]) => setParamUnit(key, cfg[system]));
  updateFormUnitsUI();
}

// Adds a small unit switch (e.g. "cm | in") to the header of each measurement card
function buildUnitSwitches() {
  Object.entries(PARAM_UNITS).forEach(([key, cfg]) => {
    const card = document.getElementById(cfg.card);
    const guideBtn = card && card.querySelector('.btn-guide-trigger');
    if (!guideBtn) return;

    const actions = document.createElement('div');
    actions.className = 'param-header-actions';

    const sw = document.createElement('div');
    sw.className = 'param-unit-switch';
    sw.setAttribute('role', 'group');
    sw.setAttribute('aria-label', `${METRIC_LIMITS[key].label} unit`);
    Object.keys(cfg.options).forEach(unit => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.unit = unit;
      btn.textContent = UNIT_LABELS[unit];
      btn.addEventListener('click', () => setParamUnit(key, unit));
      sw.appendChild(btn);
    });

    guideBtn.replaceWith(actions);
    actions.append(sw, guideBtn);
    cfg.switchEl = sw;
  });
}

function updateFormUnitsUI() {
  Object.entries(PARAM_UNITS).forEach(([key, cfg]) => {
    const unit = state.units[key];

    // Highlight the selected unit in the card's switch
    if (cfg.switchEl) {
      cfg.switchEl.querySelectorAll('button').forEach(btn => {
        const active = btn.dataset.unit === unit;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active);
      });
    }

    if (unit === 'ft_in') return;   // ft / in boxes have fixed badges and limits

    // Unit badge and min/max of the single input box follow the selected unit
    const input = elements[cfg.input];
    const badge = input.parentElement.querySelector('.unit-badge');
    if (badge) badge.innerText = UNIT_LABELS[unit];
    const f = cfg.options[unit];
    input.min = Math.floor(METRIC_LIMITS[key].min / f);
    input.max = Math.ceil(METRIC_LIMITS[key].max / f);
  });

  // Height: one box (cm / in) or feet + inches boxes
  const ftIn = state.units.height === 'ft_in';
  elements.heightMetricWrap.classList.toggle('hidden', ftIn);
  elements.heightImperialWrap.classList.toggle('hidden', !ftIn);

  // Top toggle shows Metric / Imperial only when every parameter matches; mixed = neither
  const all = system => Object.entries(PARAM_UNITS).every(([key, cfg]) => state.units[key] === cfg[system]);
  elements.unitMetricBtn.classList.toggle('active', all('metric'));
  elements.unitImperialBtn.classList.toggle('active', all('imperial'));
}

// Sample person in model units; shown in whatever unit each parameter is set to
const SAMPLE_METRIC = { weight: 75.0, height: 178.0, waist: 84.0, upper_arm: 33.0, calf: 37.0, thigh: 56.0 };

function loadSampleData() {
  elements.inputAge.value = 28;
  Object.entries(SAMPLE_METRIC).forEach(([key, value]) => writeParamMetric(key, value));
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  
  const icon = elements.themeToggleBtn.querySelector('i');
  icon.className = nextTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

// ==========================================================================
// 5. Neural Network Processing Animation & Inference Sequence
// ==========================================================================
function runNNInferenceSequence() {
  // Read all 8 parameters, already converted to model units (kg / cm)
  const params = readMetricInputs();
  const { age, weight, height, waist, upper_arm, calf, thigh } = params;

  if (!age || !weight || !height || !waist || !upper_arm || !calf || !thigh) {
    alert("Please fill in all 8 measurement parameters before processing.");
    return;
  }

  // Catch unit mix-ups (e.g. height typed in feet into the cm box) before running the model
  const outOfRange = Object.entries(METRIC_LIMITS)
    .filter(([key, lim]) => params[key] < lim.min || params[key] > lim.max)
    .map(([key]) => formatLimit(key));
  if (outOfRange.length) {
    alert("These values look wrong - please check the selected unit:\n\n" + outOfRange.join("\n"));
    return;
  }

  // Switch to Processing State
  elements.meterInitialState.classList.add('hidden');
  elements.meterResultsState.classList.add('hidden');
  elements.meterProcessingState.classList.remove('hidden');

  // Reset steps
  resetProcessingLogs();

  let progress = 0;
  const interval = setInterval(() => {
    progress += 2;
    elements.loaderPercentage.innerText = `${progress}%`;
    elements.progressBarFill.style.width = `${progress}%`;

    if (progress === 20) {
      elements.processingStatusText.innerText = "Converting units...";
      setStepActive(elements.logStep1);
    } else if (progress === 45) {
      setStepDone(elements.logStep1);
      elements.processingStatusText.innerText = "Running the neural network...";
      setStepActive(elements.logStep2);
    } else if (progress === 70) {
      setStepDone(elements.logStep2);
      elements.processingStatusText.innerText = "Calculating body fat %...";
      setStepActive(elements.logStep3);
    } else if (progress === 90) {
      setStepDone(elements.logStep3);
      elements.processingStatusText.innerText = "Preparing your results...";
      setStepActive(elements.logStep4);
    } else if (progress >= 100) {
      clearInterval(interval);
      setStepDone(elements.logStep4);
      
      // Calculate or Fetch NN Model Result
      setTimeout(() => {
        calculateAndRenderResults(params);
      }, 400);
    }
  }, 25);
}

function resetProcessingLogs() {
  [elements.logStep1, elements.logStep2, elements.logStep3, elements.logStep4].forEach(step => {
    step.className = 'log-line';
  });
}

function setStepActive(stepEl) {
  stepEl.className = 'log-line active';
}

function setStepDone(stepEl) {
  stepEl.className = 'log-line done';
}

function showInitialState() {
  elements.meterResultsState.classList.add('hidden');
  elements.meterProcessingState.classList.add('hidden');
  elements.meterInitialState.classList.remove('hidden');
}

// ==========================================================================
// 6. Body Fat NN Calculation Logic & Meter Gauge Rendering
// ==========================================================================
// params are always in model units: weight kg, lengths cm (see readMetricInputs)
async function calculateAndRenderResults(params) {
  let fatPercentage = 0;

  // Attempt to call server API endpoint if running with backend
  try {
    const response = await fetch(state.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        unit: 'metric'   // already converted to kg / cm
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.body_fat_percentage) {
        fatPercentage = data.body_fat_percentage;
      }
    } else if (response.status === 400) {
      // The server rejected the input - show why instead of silently using the fallback
      const data = await response.json().catch(() => ({}));
      alert(data.message || "The server rejected these measurements.");
      showInitialState();
      return;
    }
  } catch (e) {
    console.log("Using client-side Neural Net multi-site regression fallback.");
  }

  // Fallback calculation if backend endpoint is offline or static
  if (!fatPercentage) {
    const { age, sex, weight, height, waist, upper_arm, calf, thigh } = params;

    const bmi = weight / ((height / 100.0) ** 2);
    const waistHtRatio = waist / height;
    const limbSum = upper_arm + calf + thigh;

    if (sex === 'male') {
      fatPercentage = (1.20 * bmi) + (0.23 * age) + (waistHtRatio * 38.0) - (limbSum / height * 18.0) - 17.5;
    } else {
      fatPercentage = (1.20 * bmi) + (0.23 * age) + (waistHtRatio * 34.0) - (limbSum / height * 14.0) - 6.5;
    }

    fatPercentage = Math.min(Math.max(fatPercentage, 5.0), 48.0);
    fatPercentage = parseFloat(fatPercentage.toFixed(1));
  }

  // Compute Mass Metrics
  const totalWeightKg = params.weight;   // already kg
  const fatMassKg = totalWeightKg * (fatPercentage / 100);
  const leanMassKg = totalWeightKg - fatMassKg;
  const heightMeters = params.height / 100;   // already cm
  const bmi = totalWeightKg / (heightMeters * heightMeters);

  // Unit display values
  // Fat / lean mass are shown in the unit chosen for body weight
  const weightFactor = PARAM_UNITS.weight.options[state.units.weight];
  const displayWeightUnit = UNIT_LABELS[state.units.weight];
  const displayFatMass = (fatMassKg / weightFactor).toFixed(1);
  const displayLeanMass = (leanMassKg / weightFactor).toFixed(1);

  // Render to DOM elements
  elements.resultFatPercent.innerText = fatPercentage.toString();
  elements.resultFatMass.innerText = `${displayFatMass} ${displayWeightUnit}`;
  elements.resultLeanMass.innerText = `${displayLeanMass} ${displayWeightUnit}`;
  elements.resultBMI.innerText = `${bmi.toFixed(1)} kg/m²`;
  elements.resultTimestamp.innerText = `Scanned ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  // Determine Category & Gauge Needle Rotation Angle
  const categoryInfo = getCategoryAndGaugeAngle(fatPercentage, state.gender);
  
  // Set Category Badge
  elements.resultCategoryBadge.className = `fat-category-badge ${categoryInfo.badgeClass}`;
  elements.resultCategoryBadge.innerHTML = `<i class="${categoryInfo.icon}"></i> <span>${categoryInfo.title}</span>`;
  elements.resultHealthyRange.innerText = categoryInfo.healthyRange;
  elements.resultInsightDesc.innerText = categoryInfo.description;

  // Draw the sex-specific color ring, then animate the needle (-90deg at 5%, +90deg at 40%+)
  drawGaugeSegments(state.gender);
  elements.gaugeNeedleGroup.style.transform = `rotate(${categoryInfo.angle}deg)`;

  // Show Results State
  elements.meterProcessingState.classList.add('hidden');
  elements.meterResultsState.classList.remove('hidden');
}

// Gauge scale: 5% (left end) to 40% (right end) over a 180deg semicircle
const GAUGE_MIN_FAT = 5;
const GAUGE_MAX_FAT = 40;
const GAUGE_CX = 150, GAUGE_CY = 150, GAUGE_R = 120, GAUGE_LABEL_R = 145;

// Category boundaries - must match the thresholds in getCategoryAndGaugeAngle()
const GAUGE_BOUNDARIES = {
  male: [6, 14, 18, 25],
  female: [13, 21, 25, 32]
};
// Essential, Athletic, Fitness, Average, Overfat (same colors as the category badges)
const GAUGE_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

// Point on the gauge circle for a fat %, 5% = left (180deg), 40% = right (0deg)
function gaugePoint(fat, radius) {
  const theta = Math.PI * (1 - (fat - GAUGE_MIN_FAT) / (GAUGE_MAX_FAT - GAUGE_MIN_FAT));
  return {
    x: (GAUGE_CX + radius * Math.cos(theta)).toFixed(2),
    y: (GAUGE_CY - radius * Math.sin(theta)).toFixed(2)
  };
}

function drawGaugeSegments(gender) {
  const segGroup = document.getElementById('gaugeSegments');
  const labelGroup = document.getElementById('gaugeLabels');
  if (!segGroup || !labelGroup) return;

  const boundaries = GAUGE_BOUNDARIES[gender] || GAUGE_BOUNDARIES.male;
  const stops = [GAUGE_MIN_FAT, ...boundaries, GAUGE_MAX_FAT];

  // Round caps only on the two outer ends. Those end segments are drawn first so the
  // middle segments cover their inner caps and the joins stay clean.
  const last = GAUGE_COLORS.length - 1;
  const drawOrder = [0, last, ...GAUGE_COLORS.keys()].filter((v, i, a) => a.indexOf(v) === i);
  segGroup.innerHTML = drawOrder.map(i => {
    const start = gaugePoint(stops[i], GAUGE_R);
    const end = gaugePoint(stops[i + 1], GAUGE_R);
    const cap = (i === 0 || i === last) ? ' stroke-linecap="round"' : '';
    return `<path d="M ${start.x} ${start.y} A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${end.x} ${end.y}" fill="none" stroke="${GAUGE_COLORS[i]}" stroke-width="20"${cap}/>`;
  }).join('');

  // Labels at both ends and at each boundary (skip ones too close to an end label)
  const labelValues = stops.filter((v, i) =>
    i === 0 || i === stops.length - 1 ||
    (v - GAUGE_MIN_FAT >= 3 && GAUGE_MAX_FAT - v >= 3));

  labelGroup.innerHTML = labelValues.map(v => {
    const isEnd = v === GAUGE_MIN_FAT || v === GAUGE_MAX_FAT;
    const p = isEnd ? { x: gaugePoint(v, GAUGE_R).x, y: GAUGE_CY + 22 } : gaugePoint(v, GAUGE_LABEL_R);
    const text = v === GAUGE_MAX_FAT ? `${v}%+` : `${v}%`;
    return `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-size="10">${text}</text>`;
  }).join('');
}

function getCategoryAndGaugeAngle(fatPercent, gender) {
  // Map fat percentage (5% to 40%) to angle (-90deg to +90deg)
  const minFat = 5;
  const maxFat = 40;
  const clamped = Math.min(Math.max(fatPercent, minFat), maxFat);
  const angle = -90 + ((clamped - minFat) / (maxFat - minFat)) * 180;

  if (gender === 'male') {
    if (fatPercent < 6.0) {
      return {
        title: "Essential Fat",
        badgeClass: "category-essential",
        icon: "fa-solid fa-triangle-exclamation",
        angle,
        healthyRange: "10% - 20%",
        description: "Your body fat is extremely low (essential minimum). Ensure adequate calorie and healthy lipid intake."
      };
    } else if (fatPercent <= 13.9) {
      return {
        title: "Athletic Category",
        badgeClass: "category-athletic",
        icon: "fa-solid fa-trophy",
        angle,
        healthyRange: "10% - 20%",
        description: "Exceptional athletic composition with low body fat and high vascularity."
      };
    } else if (fatPercent <= 17.9) {
      return {
        title: "Fitness Category",
        badgeClass: "category-fit",
        icon: "fa-solid fa-heart-pulse",
        angle,
        healthyRange: "10% - 20%",
        description: "Optimal healthy fitness range. Supports metabolic vitality and cardiovascular health."
      };
    } else if (fatPercent <= 24.9) {
      return {
        title: "Acceptable / Average",
        badgeClass: "category-average",
        icon: "fa-solid fa-user-check",
        angle,
        healthyRange: "10% - 20%",
        description: "Average healthy body composition. Maintaining balanced nutrition and resistance training recommended."
      };
    } else {
      return {
        title: "Overfat / High Risk",
        badgeClass: "category-overfat",
        icon: "fa-solid fa-circle-exclamation",
        angle,
        healthyRange: "10% - 20%",
        description: "Body fat percentage is above recommended medical targets. Moderate aerobic exercise is advised."
      };
    }
  } else {
    // Female Thresholds
    if (fatPercent < 13.0) {
      return {
        title: "Essential Fat",
        badgeClass: "category-essential",
        icon: "fa-solid fa-triangle-exclamation",
        angle,
        healthyRange: "18% - 28%",
        description: "Extremely low body fat for female physiology. May impact hormonal equilibrium."
      };
    } else if (fatPercent <= 20.9) {
      return {
        title: "Athletic Category",
        badgeClass: "category-athletic",
        icon: "fa-solid fa-trophy",
        angle,
        healthyRange: "18% - 28%",
        description: "Athletic body fat level with excellent lean muscle density."
      };
    } else if (fatPercent <= 24.9) {
      return {
        title: "Fitness Category",
        badgeClass: "category-fit",
        icon: "fa-solid fa-heart-pulse",
        angle,
        healthyRange: "18% - 28%",
        description: "Optimal female fitness range with prime metabolic and cardiovascular health markers."
      };
    } else if (fatPercent <= 31.9) {
      return {
        title: "Acceptable / Average",
        badgeClass: "category-average",
        icon: "fa-solid fa-user-check",
        angle,
        healthyRange: "18% - 28%",
        description: "Standard body fat range. Moderate physical activity helps maintain active lean mass."
      };
    } else {
      return {
        title: "Overfat / High Risk",
        badgeClass: "category-overfat",
        icon: "fa-solid fa-circle-exclamation",
        angle,
        healthyRange: "18% - 28%",
        description: "Body fat percentage exceeds target health range. Lifestyle and dietary adjustments recommended."
      };
    }
  }
}

// ==========================================================================
// 7. Interactive Guide Modal System
// ==========================================================================
function toggleGuideModal(paramKey) {
  const guide = GUIDE_DATABASE[paramKey];
  if (!guide) return;

  elements.modalImg.src = guide.image;
  elements.modalImg.classList.toggle('img-diagram', guide.fit === 'contain');
  elements.modalBadge.innerText = guide.badge;
  elements.modalTitle.innerText = guide.title;
  elements.modalDesc.innerText = guide.desc;

  // Render tips (the "Measurement Best Practices" heading is already in index.html)
  elements.modalTipsList.innerHTML = guide.tips
    .map(tip => `<li><i class="fa-solid fa-angle-right" style="color: var(--accent-cyan);"></i> ${tip}</li>`)
    .join('');

  elements.guideModalBackdrop.classList.add('open');
}

function closeGuideModal(event) {
  if (event.target === elements.guideModalBackdrop) {
    elements.guideModalBackdrop.classList.remove('open');
  }
}

function closeGuideModalForce() {
  elements.guideModalBackdrop.classList.remove('open');
}
