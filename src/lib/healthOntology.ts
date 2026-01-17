/**
 * HUMAN DIGITAL TWIN - MODULAR HEALTH ONTOLOGY
 * 
 * A comprehensive ontology defining biological systems, their relationships,
 * inputs, states, outputs, and visualization parameters for a human digital twin.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type SystemId = 
  | 'nervous' 
  | 'cardiovascular' 
  | 'respiratory' 
  | 'metabolic' 
  | 'immune' 
  | 'musculoskeletal';

export type SignalType = 'input' | 'state' | 'output' | 'biomarker';
export type DataSource = 'sensor' | 'lab' | 'self_report' | 'derived' | 'prediction';
export type Frequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RiskLevel = 'optimal' | 'normal' | 'elevated' | 'high' | 'critical';

// ============================================================================
// SIGNAL DEFINITION
// ============================================================================

export interface HealthSignal {
  id: string;
  name: string;
  nameVi: string;
  type: SignalType;
  unit: string;
  normalRange: { min: number; max: number } | string;
  criticalRange?: { low: number; high: number };
  source: DataSource[];
  frequency: Frequency;
  // Visualization
  visualPriority: 1 | 2 | 3; // 1 = always show, 2 = show on hover, 3 = show on drill-down
  chartType?: 'line' | 'bar' | 'gauge' | 'sparkline';
}

// ============================================================================
// SYSTEM DEFINITION
// ============================================================================

export interface BiologicalSystem {
  id: SystemId;
  name: string;
  nameVi: string;
  description: string;
  icon: string; // Lucide icon name
  
  // Visualization on body silhouette
  visualization: {
    primaryPosition: { x: number; y: number }; // % position on silhouette
    secondaryPositions?: { x: number; y: number; label: string }[];
    size: 'sm' | 'md' | 'lg';
    glowRadius: number;
    animationType: 'pulse' | 'breathe' | 'wave' | 'static';
    animationSpeed: number; // seconds per cycle
  };
  
  // System signals
  inputs: HealthSignal[];   // External factors affecting this system
  states: HealthSignal[];   // Current internal state variables
  outputs: HealthSignal[];  // What this system produces/affects
  
  // Dependencies
  affectedBy: SystemId[];   // Systems that influence this one
  affects: SystemId[];      // Systems this one influences
  
  // Risk calculation weights
  riskWeights: {
    signalId: string;
    weight: number; // 0-1, how much this signal affects overall system risk
  }[];
}

// ============================================================================
// SYSTEM DEFINITIONS
// ============================================================================

export const NERVOUS_SYSTEM: BiologicalSystem = {
  id: 'nervous',
  name: 'Nervous System',
  nameVi: 'Hệ thần kinh',
  description: 'Central command system controlling cognition, stress response, and autonomic functions',
  icon: 'Brain',
  
  visualization: {
    primaryPosition: { x: 50, y: 8 },
    secondaryPositions: [
      { x: 50, y: 60, label: 'Spine' }
    ],
    size: 'lg',
    glowRadius: 12,
    animationType: 'pulse',
    animationSpeed: 2
  },
  
  inputs: [
    { id: 'stress_exposure', name: 'Stress Exposure', nameVi: 'Phơi nhiễm stress', type: 'input', unit: 'score', normalRange: { min: 0, max: 40 }, source: ['self_report', 'derived'], frequency: 'daily', visualPriority: 2 },
    { id: 'sleep_duration', name: 'Sleep Duration', nameVi: 'Thời gian ngủ', type: 'input', unit: 'hours', normalRange: { min: 7, max: 9 }, source: ['sensor', 'self_report'], frequency: 'daily', visualPriority: 1, chartType: 'bar' },
    { id: 'caffeine_intake', name: 'Caffeine Intake', nameVi: 'Lượng caffeine', type: 'input', unit: 'mg', normalRange: { min: 0, max: 400 }, source: ['self_report'], frequency: 'daily', visualPriority: 3 },
    { id: 'screen_time', name: 'Screen Time', nameVi: 'Thời gian màn hình', type: 'input', unit: 'hours', normalRange: { min: 0, max: 6 }, source: ['sensor'], frequency: 'daily', visualPriority: 2 }
  ],
  
  states: [
    { id: 'cognitive_score', name: 'Cognitive Function', nameVi: 'Chức năng nhận thức', type: 'state', unit: '/100', normalRange: { min: 80, max: 100 }, source: ['derived'], frequency: 'daily', visualPriority: 1, chartType: 'gauge' },
    { id: 'stress_level', name: 'Stress Level', nameVi: 'Mức stress', type: 'state', unit: 'level', normalRange: 'Low-Moderate', source: ['derived', 'sensor'], frequency: 'realtime', visualPriority: 1, chartType: 'gauge' },
    { id: 'sleep_quality', name: 'Sleep Quality', nameVi: 'Chất lượng giấc ngủ', type: 'state', unit: '%', normalRange: { min: 85, max: 100 }, source: ['sensor'], frequency: 'daily', visualPriority: 1, chartType: 'line' },
    { id: 'hrv_score', name: 'HRV Score', nameVi: 'Điểm HRV', type: 'state', unit: 'ms', normalRange: { min: 50, max: 100 }, source: ['sensor'], frequency: 'hourly', visualPriority: 2, chartType: 'sparkline' }
  ],
  
  outputs: [
    { id: 'cortisol_level', name: 'Cortisol Level', nameVi: 'Nồng độ cortisol', type: 'output', unit: 'μg/dL', normalRange: { min: 6, max: 18 }, criticalRange: { low: 3, high: 25 }, source: ['lab'], frequency: 'monthly', visualPriority: 2 },
    { id: 'autonomic_balance', name: 'Autonomic Balance', nameVi: 'Cân bằng tự chủ', type: 'output', unit: 'ratio', normalRange: { min: 0.8, max: 1.2 }, source: ['derived'], frequency: 'daily', visualPriority: 2 },
    { id: 'neurotransmitter_index', name: 'Neurotransmitter Index', nameVi: 'Chỉ số dẫn truyền TK', type: 'output', unit: 'score', normalRange: { min: 70, max: 100 }, source: ['prediction'], frequency: 'weekly', visualPriority: 3 }
  ],
  
  affectedBy: ['cardiovascular', 'metabolic', 'immune'],
  affects: ['cardiovascular', 'respiratory', 'metabolic', 'immune', 'musculoskeletal'],
  
  riskWeights: [
    { signalId: 'stress_level', weight: 0.25 },
    { signalId: 'sleep_quality', weight: 0.25 },
    { signalId: 'cognitive_score', weight: 0.2 },
    { signalId: 'hrv_score', weight: 0.15 },
    { signalId: 'cortisol_level', weight: 0.15 }
  ]
};

export const CARDIOVASCULAR_SYSTEM: BiologicalSystem = {
  id: 'cardiovascular',
  name: 'Cardiovascular System',
  nameVi: 'Hệ tim mạch',
  description: 'Heart and blood vessel network responsible for circulation and oxygen delivery',
  icon: 'Heart',
  
  visualization: {
    primaryPosition: { x: 44, y: 33 },
    secondaryPositions: [
      { x: 50, y: 50, label: 'Aorta' },
      { x: 35, y: 70, label: 'Femoral' }
    ],
    size: 'lg',
    glowRadius: 14,
    animationType: 'pulse',
    animationSpeed: 0.8 // Heartbeat rhythm
  },
  
  inputs: [
    { id: 'sodium_intake', name: 'Sodium Intake', nameVi: 'Lượng natri', type: 'input', unit: 'mg', normalRange: { min: 0, max: 2300 }, source: ['self_report'], frequency: 'daily', visualPriority: 2 },
    { id: 'physical_activity', name: 'Physical Activity', nameVi: 'Hoạt động thể chất', type: 'input', unit: 'min', normalRange: { min: 30, max: 60 }, source: ['sensor'], frequency: 'daily', visualPriority: 1 },
    { id: 'alcohol_intake', name: 'Alcohol Intake', nameVi: 'Lượng rượu', type: 'input', unit: 'drinks', normalRange: { min: 0, max: 1 }, source: ['self_report'], frequency: 'daily', visualPriority: 3 },
    { id: 'medication_adherence', name: 'Medication Adherence', nameVi: 'Tuân thủ thuốc', type: 'input', unit: '%', normalRange: { min: 95, max: 100 }, source: ['self_report'], frequency: 'daily', visualPriority: 1 }
  ],
  
  states: [
    { id: 'heart_rate', name: 'Heart Rate', nameVi: 'Nhịp tim', type: 'state', unit: 'bpm', normalRange: { min: 60, max: 80 }, criticalRange: { low: 40, high: 120 }, source: ['sensor'], frequency: 'realtime', visualPriority: 1, chartType: 'sparkline' },
    { id: 'blood_pressure_sys', name: 'Systolic BP', nameVi: 'HA tâm thu', type: 'state', unit: 'mmHg', normalRange: { min: 90, max: 120 }, criticalRange: { low: 80, high: 180 }, source: ['sensor', 'self_report'], frequency: 'hourly', visualPriority: 1, chartType: 'line' },
    { id: 'blood_pressure_dia', name: 'Diastolic BP', nameVi: 'HA tâm trương', type: 'state', unit: 'mmHg', normalRange: { min: 60, max: 80 }, criticalRange: { low: 50, high: 120 }, source: ['sensor', 'self_report'], frequency: 'hourly', visualPriority: 1, chartType: 'line' },
    { id: 'resting_hr', name: 'Resting Heart Rate', nameVi: 'Nhịp tim nghỉ', type: 'state', unit: 'bpm', normalRange: { min: 50, max: 70 }, source: ['sensor'], frequency: 'daily', visualPriority: 2 }
  ],
  
  outputs: [
    { id: 'cardiac_output', name: 'Cardiac Output', nameVi: 'Cung lượng tim', type: 'output', unit: 'L/min', normalRange: { min: 4, max: 8 }, source: ['derived'], frequency: 'daily', visualPriority: 3 },
    { id: 'cholesterol_total', name: 'Total Cholesterol', nameVi: 'Cholesterol toàn phần', type: 'biomarker', unit: 'mg/dL', normalRange: { min: 0, max: 200 }, criticalRange: { low: 0, high: 240 }, source: ['lab'], frequency: 'yearly', visualPriority: 1 },
    { id: 'ldl', name: 'LDL Cholesterol', nameVi: 'LDL', type: 'biomarker', unit: 'mg/dL', normalRange: { min: 0, max: 100 }, source: ['lab'], frequency: 'yearly', visualPriority: 1 },
    { id: 'hdl', name: 'HDL Cholesterol', nameVi: 'HDL', type: 'biomarker', unit: 'mg/dL', normalRange: { min: 40, max: 60 }, source: ['lab'], frequency: 'yearly', visualPriority: 2 },
    { id: 'triglycerides', name: 'Triglycerides', nameVi: 'Triglyceride', type: 'biomarker', unit: 'mg/dL', normalRange: { min: 0, max: 150 }, source: ['lab'], frequency: 'yearly', visualPriority: 2 }
  ],
  
  affectedBy: ['nervous', 'respiratory', 'metabolic'],
  affects: ['nervous', 'respiratory', 'metabolic', 'immune', 'musculoskeletal'],
  
  riskWeights: [
    { signalId: 'blood_pressure_sys', weight: 0.25 },
    { signalId: 'blood_pressure_dia', weight: 0.15 },
    { signalId: 'cholesterol_total', weight: 0.15 },
    { signalId: 'ldl', weight: 0.15 },
    { signalId: 'heart_rate', weight: 0.1 },
    { signalId: 'resting_hr', weight: 0.1 },
    { signalId: 'physical_activity', weight: 0.1 }
  ]
};

export const RESPIRATORY_SYSTEM: BiologicalSystem = {
  id: 'respiratory',
  name: 'Respiratory System',
  nameVi: 'Hệ hô hấp',
  description: 'Lungs and airways responsible for gas exchange and oxygenation',
  icon: 'Wind',
  
  visualization: {
    primaryPosition: { x: 56, y: 32 },
    secondaryPositions: [
      { x: 50, y: 15, label: 'Sinuses' },
      { x: 50, y: 22, label: 'Throat' }
    ],
    size: 'md',
    glowRadius: 10,
    animationType: 'breathe',
    animationSpeed: 4 // Breathing rhythm
  },
  
  inputs: [
    { id: 'air_quality', name: 'Air Quality Index', nameVi: 'Chỉ số AQI', type: 'input', unit: 'AQI', normalRange: { min: 0, max: 50 }, criticalRange: { low: 0, high: 150 }, source: ['sensor'], frequency: 'hourly', visualPriority: 1 },
    { id: 'smoking_status', name: 'Smoking Status', nameVi: 'Tình trạng hút thuốc', type: 'input', unit: 'status', normalRange: 'Never/Former', source: ['self_report'], frequency: 'monthly', visualPriority: 1 },
    { id: 'allergen_exposure', name: 'Allergen Exposure', nameVi: 'Phơi nhiễm dị ứng', type: 'input', unit: 'level', normalRange: 'Low', source: ['sensor', 'self_report'], frequency: 'daily', visualPriority: 2 },
    { id: 'barometric_pressure', name: 'Barometric Pressure', nameVi: 'Áp suất khí quyển', type: 'input', unit: 'hPa', normalRange: { min: 1000, max: 1025 }, source: ['sensor'], frequency: 'hourly', visualPriority: 3 }
  ],
  
  states: [
    { id: 'spo2', name: 'Oxygen Saturation', nameVi: 'Độ bão hòa oxy', type: 'state', unit: '%', normalRange: { min: 95, max: 100 }, criticalRange: { low: 90, high: 100 }, source: ['sensor'], frequency: 'realtime', visualPriority: 1, chartType: 'gauge' },
    { id: 'respiratory_rate', name: 'Respiratory Rate', nameVi: 'Nhịp thở', type: 'state', unit: '/min', normalRange: { min: 12, max: 20 }, criticalRange: { low: 8, high: 30 }, source: ['sensor'], frequency: 'realtime', visualPriority: 1, chartType: 'sparkline' },
    { id: 'peak_flow', name: 'Peak Flow', nameVi: 'Lưu lượng đỉnh', type: 'state', unit: 'L/min', normalRange: { min: 400, max: 700 }, source: ['sensor'], frequency: 'daily', visualPriority: 2 },
    { id: 'breath_quality', name: 'Breath Quality', nameVi: 'Chất lượng thở', type: 'state', unit: 'score', normalRange: { min: 80, max: 100 }, source: ['derived'], frequency: 'hourly', visualPriority: 2 }
  ],
  
  outputs: [
    { id: 'lung_capacity', name: 'Lung Capacity', nameVi: 'Dung tích phổi', type: 'output', unit: 'L', normalRange: { min: 4, max: 6 }, source: ['lab'], frequency: 'yearly', visualPriority: 2 },
    { id: 'vo2_max', name: 'VO2 Max', nameVi: 'VO2 Max', type: 'output', unit: 'mL/kg/min', normalRange: { min: 35, max: 55 }, source: ['sensor', 'derived'], frequency: 'monthly', visualPriority: 2 },
    { id: 'co2_level', name: 'CO2 Level', nameVi: 'Nồng độ CO2', type: 'output', unit: 'mmHg', normalRange: { min: 35, max: 45 }, source: ['lab'], frequency: 'monthly', visualPriority: 3 }
  ],
  
  affectedBy: ['nervous', 'cardiovascular', 'immune'],
  affects: ['cardiovascular', 'nervous', 'metabolic'],
  
  riskWeights: [
    { signalId: 'spo2', weight: 0.3 },
    { signalId: 'respiratory_rate', weight: 0.2 },
    { signalId: 'peak_flow', weight: 0.15 },
    { signalId: 'air_quality', weight: 0.15 },
    { signalId: 'smoking_status', weight: 0.1 },
    { signalId: 'lung_capacity', weight: 0.1 }
  ]
};

export const METABOLIC_SYSTEM: BiologicalSystem = {
  id: 'metabolic',
  name: 'Metabolic System',
  nameVi: 'Hệ chuyển hóa',
  description: 'Pancreas, liver, and endocrine organs controlling energy metabolism and hormones',
  icon: 'Droplets',
  
  visualization: {
    primaryPosition: { x: 58, y: 46 },
    secondaryPositions: [
      { x: 40, y: 44, label: 'Liver' },
      { x: 50, y: 20, label: 'Thyroid' }
    ],
    size: 'lg',
    glowRadius: 12,
    animationType: 'wave',
    animationSpeed: 3
  },
  
  inputs: [
    { id: 'caloric_intake', name: 'Caloric Intake', nameVi: 'Lượng calo', type: 'input', unit: 'kcal', normalRange: { min: 1500, max: 2500 }, source: ['self_report'], frequency: 'daily', visualPriority: 2 },
    { id: 'carb_intake', name: 'Carbohydrate Intake', nameVi: 'Lượng carb', type: 'input', unit: 'g', normalRange: { min: 200, max: 300 }, source: ['self_report'], frequency: 'daily', visualPriority: 2 },
    { id: 'meal_timing', name: 'Meal Timing', nameVi: 'Thời gian ăn', type: 'input', unit: 'pattern', normalRange: 'Regular', source: ['self_report'], frequency: 'daily', visualPriority: 3 },
    { id: 'fasting_duration', name: 'Fasting Duration', nameVi: 'Thời gian nhịn ăn', type: 'input', unit: 'hours', normalRange: { min: 12, max: 16 }, source: ['self_report'], frequency: 'daily', visualPriority: 2 }
  ],
  
  states: [
    { id: 'blood_glucose', name: 'Blood Glucose', nameVi: 'Đường huyết', type: 'state', unit: 'mg/dL', normalRange: { min: 70, max: 100 }, criticalRange: { low: 54, high: 180 }, source: ['sensor', 'lab'], frequency: 'realtime', visualPriority: 1, chartType: 'line' },
    { id: 'hba1c', name: 'HbA1c', nameVi: 'HbA1c', type: 'biomarker', unit: '%', normalRange: { min: 4, max: 5.7 }, criticalRange: { low: 0, high: 6.5 }, source: ['lab'], frequency: 'monthly', visualPriority: 1, chartType: 'gauge' },
    { id: 'insulin_sensitivity', name: 'Insulin Sensitivity', nameVi: 'Độ nhạy insulin', type: 'state', unit: 'index', normalRange: { min: 1, max: 2 }, source: ['derived'], frequency: 'weekly', visualPriority: 2 },
    { id: 'metabolic_rate', name: 'Basal Metabolic Rate', nameVi: 'Chuyển hóa cơ bản', type: 'state', unit: 'kcal/day', normalRange: { min: 1400, max: 2000 }, source: ['derived'], frequency: 'weekly', visualPriority: 2 }
  ],
  
  outputs: [
    { id: 'alt', name: 'ALT (Liver)', nameVi: 'ALT (Gan)', type: 'biomarker', unit: 'U/L', normalRange: { min: 7, max: 56 }, source: ['lab'], frequency: 'yearly', visualPriority: 2 },
    { id: 'ast', name: 'AST (Liver)', nameVi: 'AST (Gan)', type: 'biomarker', unit: 'U/L', normalRange: { min: 10, max: 40 }, source: ['lab'], frequency: 'yearly', visualPriority: 2 },
    { id: 'tsh', name: 'TSH (Thyroid)', nameVi: 'TSH (Tuyến giáp)', type: 'biomarker', unit: 'mIU/L', normalRange: { min: 0.4, max: 4 }, source: ['lab'], frequency: 'yearly', visualPriority: 2 },
    { id: 'bmi', name: 'BMI', nameVi: 'Chỉ số BMI', type: 'output', unit: 'kg/m²', normalRange: { min: 18.5, max: 24.9 }, source: ['derived'], frequency: 'weekly', visualPriority: 1 },
    { id: 'body_fat', name: 'Body Fat %', nameVi: '% mỡ cơ thể', type: 'output', unit: '%', normalRange: { min: 10, max: 25 }, source: ['sensor'], frequency: 'weekly', visualPriority: 2 }
  ],
  
  affectedBy: ['nervous', 'cardiovascular', 'musculoskeletal'],
  affects: ['cardiovascular', 'nervous', 'immune', 'musculoskeletal'],
  
  riskWeights: [
    { signalId: 'blood_glucose', weight: 0.25 },
    { signalId: 'hba1c', weight: 0.25 },
    { signalId: 'bmi', weight: 0.15 },
    { signalId: 'insulin_sensitivity', weight: 0.15 },
    { signalId: 'alt', weight: 0.1 },
    { signalId: 'tsh', weight: 0.1 }
  ]
};

export const IMMUNE_SYSTEM: BiologicalSystem = {
  id: 'immune',
  name: 'Immune System',
  nameVi: 'Hệ miễn dịch',
  description: 'Defense system including white blood cells, lymph nodes, and inflammatory responses',
  icon: 'Shield',
  
  visualization: {
    primaryPosition: { x: 50, y: 55 },
    secondaryPositions: [
      { x: 45, y: 25, label: 'Thymus' },
      { x: 55, y: 52, label: 'Spleen' },
      { x: 35, y: 40, label: 'Lymph nodes' }
    ],
    size: 'md',
    glowRadius: 10,
    animationType: 'wave',
    animationSpeed: 5
  },
  
  inputs: [
    { id: 'pathogen_exposure', name: 'Pathogen Exposure', nameVi: 'Phơi nhiễm mầm bệnh', type: 'input', unit: 'level', normalRange: 'Low', source: ['derived'], frequency: 'daily', visualPriority: 2 },
    { id: 'vaccination_status', name: 'Vaccination Status', nameVi: 'Tình trạng tiêm chủng', type: 'input', unit: 'status', normalRange: 'Up to date', source: ['self_report'], frequency: 'yearly', visualPriority: 2 },
    { id: 'chronic_stress', name: 'Chronic Stress', nameVi: 'Stress mãn tính', type: 'input', unit: 'level', normalRange: 'Low-Moderate', source: ['derived'], frequency: 'weekly', visualPriority: 2 },
    { id: 'sleep_debt', name: 'Sleep Debt', nameVi: 'Nợ giấc ngủ', type: 'input', unit: 'hours', normalRange: { min: 0, max: 2 }, source: ['derived'], frequency: 'weekly', visualPriority: 3 }
  ],
  
  states: [
    { id: 'wbc_count', name: 'White Blood Cell Count', nameVi: 'Số lượng bạch cầu', type: 'biomarker', unit: 'K/uL', normalRange: { min: 4.5, max: 11 }, source: ['lab'], frequency: 'yearly', visualPriority: 1 },
    { id: 'crp', name: 'C-Reactive Protein', nameVi: 'CRP', type: 'biomarker', unit: 'mg/L', normalRange: { min: 0, max: 3 }, criticalRange: { low: 0, high: 10 }, source: ['lab'], frequency: 'monthly', visualPriority: 1 },
    { id: 'inflammation_index', name: 'Inflammation Index', nameVi: 'Chỉ số viêm', type: 'state', unit: 'score', normalRange: { min: 0, max: 30 }, source: ['derived'], frequency: 'daily', visualPriority: 1, chartType: 'gauge' },
    { id: 'immune_readiness', name: 'Immune Readiness', nameVi: 'Sẵn sàng miễn dịch', type: 'state', unit: '%', normalRange: { min: 80, max: 100 }, source: ['derived'], frequency: 'daily', visualPriority: 2 }
  ],
  
  outputs: [
    { id: 'recovery_rate', name: 'Recovery Rate', nameVi: 'Tốc độ phục hồi', type: 'output', unit: 'days', normalRange: { min: 3, max: 7 }, source: ['derived'], frequency: 'monthly', visualPriority: 3 },
    { id: 'autoimmune_risk', name: 'Autoimmune Risk', nameVi: 'Nguy cơ tự miễn', type: 'output', unit: '%', normalRange: { min: 0, max: 10 }, source: ['prediction'], frequency: 'yearly', visualPriority: 2 },
    { id: 'infection_susceptibility', name: 'Infection Susceptibility', nameVi: 'Nguy cơ nhiễm trùng', type: 'output', unit: 'level', normalRange: 'Low', source: ['prediction'], frequency: 'weekly', visualPriority: 2 }
  ],
  
  affectedBy: ['nervous', 'metabolic', 'respiratory'],
  affects: ['nervous', 'cardiovascular', 'respiratory', 'metabolic', 'musculoskeletal'],
  
  riskWeights: [
    { signalId: 'crp', weight: 0.25 },
    { signalId: 'wbc_count', weight: 0.2 },
    { signalId: 'inflammation_index', weight: 0.2 },
    { signalId: 'immune_readiness', weight: 0.15 },
    { signalId: 'chronic_stress', weight: 0.1 },
    { signalId: 'sleep_debt', weight: 0.1 }
  ]
};

export const MUSCULOSKELETAL_SYSTEM: BiologicalSystem = {
  id: 'musculoskeletal',
  name: 'Musculoskeletal System',
  nameVi: 'Hệ cơ xương khớp',
  description: 'Bones, muscles, joints, and connective tissue providing structure and movement',
  icon: 'Bone',
  
  visualization: {
    primaryPosition: { x: 35, y: 68 },
    secondaryPositions: [
      { x: 65, y: 68, label: 'Right leg' },
      { x: 30, y: 40, label: 'Spine' },
      { x: 22, y: 50, label: 'Left arm' }
    ],
    size: 'md',
    glowRadius: 8,
    animationType: 'static',
    animationSpeed: 0
  },
  
  inputs: [
    { id: 'exercise_minutes', name: 'Exercise Minutes', nameVi: 'Phút tập thể dục', type: 'input', unit: 'min', normalRange: { min: 150, max: 300 }, source: ['sensor', 'self_report'], frequency: 'weekly', visualPriority: 1 },
    { id: 'strength_training', name: 'Strength Training', nameVi: 'Tập sức mạnh', type: 'input', unit: 'sessions', normalRange: { min: 2, max: 4 }, source: ['self_report'], frequency: 'weekly', visualPriority: 2 },
    { id: 'daily_steps', name: 'Daily Steps', nameVi: 'Số bước/ngày', type: 'input', unit: 'steps', normalRange: { min: 7000, max: 12000 }, source: ['sensor'], frequency: 'daily', visualPriority: 1, chartType: 'bar' },
    { id: 'posture_score', name: 'Posture Score', nameVi: 'Điểm tư thế', type: 'input', unit: '/100', normalRange: { min: 70, max: 100 }, source: ['sensor'], frequency: 'daily', visualPriority: 2 }
  ],
  
  states: [
    { id: 'bone_density', name: 'Bone Density', nameVi: 'Mật độ xương', type: 'state', unit: 'T-score', normalRange: { min: -1, max: 1 }, source: ['lab'], frequency: 'yearly', visualPriority: 1 },
    { id: 'muscle_mass', name: 'Muscle Mass', nameVi: 'Khối cơ', type: 'state', unit: 'kg', normalRange: { min: 25, max: 40 }, source: ['sensor'], frequency: 'weekly', visualPriority: 2 },
    { id: 'flexibility_score', name: 'Flexibility Score', nameVi: 'Điểm linh hoạt', type: 'state', unit: '/100', normalRange: { min: 60, max: 100 }, source: ['derived'], frequency: 'monthly', visualPriority: 3 },
    { id: 'joint_health', name: 'Joint Health Index', nameVi: 'Chỉ số sức khỏe khớp', type: 'state', unit: 'score', normalRange: { min: 70, max: 100 }, source: ['derived'], frequency: 'monthly', visualPriority: 2 }
  ],
  
  outputs: [
    { id: 'vitamin_d', name: 'Vitamin D', nameVi: 'Vitamin D', type: 'biomarker', unit: 'ng/mL', normalRange: { min: 30, max: 50 }, source: ['lab'], frequency: 'yearly', visualPriority: 1 },
    { id: 'calcium', name: 'Calcium', nameVi: 'Canxi', type: 'biomarker', unit: 'mg/dL', normalRange: { min: 8.5, max: 10.5 }, source: ['lab'], frequency: 'yearly', visualPriority: 2 },
    { id: 'injury_risk', name: 'Injury Risk', nameVi: 'Nguy cơ chấn thương', type: 'output', unit: '%', normalRange: { min: 0, max: 20 }, source: ['prediction'], frequency: 'weekly', visualPriority: 2 },
    { id: 'mobility_score', name: 'Mobility Score', nameVi: 'Điểm vận động', type: 'output', unit: '/100', normalRange: { min: 80, max: 100 }, source: ['derived'], frequency: 'weekly', visualPriority: 1 }
  ],
  
  affectedBy: ['nervous', 'cardiovascular', 'metabolic', 'immune'],
  affects: ['cardiovascular', 'metabolic'],
  
  riskWeights: [
    { signalId: 'bone_density', weight: 0.2 },
    { signalId: 'vitamin_d', weight: 0.15 },
    { signalId: 'daily_steps', weight: 0.15 },
    { signalId: 'muscle_mass', weight: 0.15 },
    { signalId: 'joint_health', weight: 0.15 },
    { signalId: 'mobility_score', weight: 0.1 },
    { signalId: 'injury_risk', weight: 0.1 }
  ]
};

// ============================================================================
// COMPLETE ONTOLOGY
// ============================================================================

export const HEALTH_ONTOLOGY: Record<SystemId, BiologicalSystem> = {
  nervous: NERVOUS_SYSTEM,
  cardiovascular: CARDIOVASCULAR_SYSTEM,
  respiratory: RESPIRATORY_SYSTEM,
  metabolic: METABOLIC_SYSTEM,
  immune: IMMUNE_SYSTEM,
  musculoskeletal: MUSCULOSKELETAL_SYSTEM
};

// ============================================================================
// DEPENDENCY GRAPH
// ============================================================================

export interface SystemDependency {
  from: SystemId;
  to: SystemId;
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
  signals: string[]; // Which signals are transmitted
}

export const SYSTEM_DEPENDENCIES: SystemDependency[] = [
  // Nervous → Others
  { from: 'nervous', to: 'cardiovascular', strength: 'strong', description: 'Autonomic regulation of heart rate and blood pressure', signals: ['cortisol_level', 'autonomic_balance'] },
  { from: 'nervous', to: 'respiratory', strength: 'moderate', description: 'Breathing rate and pattern control', signals: ['stress_level', 'autonomic_balance'] },
  { from: 'nervous', to: 'metabolic', strength: 'strong', description: 'Stress hormones affect metabolism and appetite', signals: ['cortisol_level', 'stress_level'] },
  { from: 'nervous', to: 'immune', strength: 'moderate', description: 'Chronic stress suppresses immune function', signals: ['cortisol_level', 'sleep_quality'] },
  { from: 'nervous', to: 'musculoskeletal', strength: 'weak', description: 'Motor control and muscle tension', signals: ['stress_level'] },
  
  // Cardiovascular → Others
  { from: 'cardiovascular', to: 'nervous', strength: 'moderate', description: 'Blood flow to brain affects cognition', signals: ['cardiac_output', 'blood_pressure_sys'] },
  { from: 'cardiovascular', to: 'respiratory', strength: 'strong', description: 'Pulmonary circulation for oxygenation', signals: ['heart_rate', 'cardiac_output'] },
  { from: 'cardiovascular', to: 'metabolic', strength: 'moderate', description: 'Nutrient and hormone delivery', signals: ['cardiac_output'] },
  { from: 'cardiovascular', to: 'immune', strength: 'weak', description: 'White blood cell transport', signals: ['cardiac_output'] },
  { from: 'cardiovascular', to: 'musculoskeletal', strength: 'moderate', description: 'Oxygen delivery to muscles', signals: ['cardiac_output', 'heart_rate'] },
  
  // Respiratory → Others
  { from: 'respiratory', to: 'cardiovascular', strength: 'strong', description: 'Oxygen saturation affects heart function', signals: ['spo2', 'respiratory_rate'] },
  { from: 'respiratory', to: 'nervous', strength: 'moderate', description: 'CO2 levels affect brain function', signals: ['spo2', 'co2_level'] },
  { from: 'respiratory', to: 'metabolic', strength: 'moderate', description: 'Oxygen for cellular metabolism', signals: ['spo2', 'vo2_max'] },
  
  // Metabolic → Others
  { from: 'metabolic', to: 'cardiovascular', strength: 'strong', description: 'Lipids and glucose affect blood vessels', signals: ['blood_glucose', 'bmi'] },
  { from: 'metabolic', to: 'nervous', strength: 'moderate', description: 'Glucose fuels brain function', signals: ['blood_glucose'] },
  { from: 'metabolic', to: 'immune', strength: 'moderate', description: 'Chronic inflammation from metabolic dysfunction', signals: ['blood_glucose', 'body_fat'] },
  { from: 'metabolic', to: 'musculoskeletal', strength: 'moderate', description: 'Energy for muscle function', signals: ['metabolic_rate', 'blood_glucose'] },
  
  // Immune → Others
  { from: 'immune', to: 'nervous', strength: 'moderate', description: 'Neuroinflammation affects cognition', signals: ['crp', 'inflammation_index'] },
  { from: 'immune', to: 'cardiovascular', strength: 'moderate', description: 'Chronic inflammation damages vessels', signals: ['crp', 'inflammation_index'] },
  { from: 'immune', to: 'respiratory', strength: 'moderate', description: 'Inflammation affects airways', signals: ['inflammation_index'] },
  { from: 'immune', to: 'metabolic', strength: 'weak', description: 'Inflammation impairs insulin sensitivity', signals: ['crp', 'inflammation_index'] },
  { from: 'immune', to: 'musculoskeletal', strength: 'weak', description: 'Inflammatory joint conditions', signals: ['crp', 'inflammation_index'] },
  
  // Musculoskeletal → Others
  { from: 'musculoskeletal', to: 'cardiovascular', strength: 'moderate', description: 'Exercise strengthens heart', signals: ['exercise_minutes', 'daily_steps'] },
  { from: 'musculoskeletal', to: 'metabolic', strength: 'strong', description: 'Muscle mass affects metabolism', signals: ['muscle_mass', 'exercise_minutes'] }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all signals for a system
 */
export function getAllSignals(systemId: SystemId): HealthSignal[] {
  const system = HEALTH_ONTOLOGY[systemId];
  return [...system.inputs, ...system.states, ...system.outputs];
}

/**
 * Get dependencies for a system
 */
export function getSystemDependencies(systemId: SystemId): {
  affectsMe: SystemDependency[];
  iAffect: SystemDependency[];
} {
  return {
    affectsMe: SYSTEM_DEPENDENCIES.filter(d => d.to === systemId),
    iAffect: SYSTEM_DEPENDENCIES.filter(d => d.from === systemId)
  };
}

/**
 * Calculate system risk score based on current values
 */
export function calculateSystemRisk(
  systemId: SystemId,
  signalValues: Record<string, number>
): { score: number; level: RiskLevel } {
  const system = HEALTH_ONTOLOGY[systemId];
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const { signalId, weight } of system.riskWeights) {
    const value = signalValues[signalId];
    if (value !== undefined) {
      const signal = getAllSignals(systemId).find(s => s.id === signalId);
      if (signal && typeof signal.normalRange === 'object') {
        const { min, max } = signal.normalRange;
        // Normalize to 0-100 where 100 is optimal
        let normalized: number;
        if (value < min) {
          normalized = Math.max(0, 100 - ((min - value) / min) * 100);
        } else if (value > max) {
          normalized = Math.max(0, 100 - ((value - max) / max) * 100);
        } else {
          normalized = 100;
        }
        weightedScore += normalized * weight;
        totalWeight += weight;
      }
    }
  }
  
  const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
  
  let level: RiskLevel;
  if (score >= 90) level = 'optimal';
  else if (score >= 75) level = 'normal';
  else if (score >= 60) level = 'elevated';
  else if (score >= 40) level = 'high';
  else level = 'critical';
  
  return { score, level };
}

/**
 * Get cascade effects when a system changes
 */
export function getCascadeEffects(
  changedSystemId: SystemId,
  changeDirection: 'improve' | 'worsen'
): { systemId: SystemId; effect: 'positive' | 'negative'; strength: string }[] {
  const effects: { systemId: SystemId; effect: 'positive' | 'negative'; strength: string }[] = [];
  
  for (const dep of SYSTEM_DEPENDENCIES.filter(d => d.from === changedSystemId)) {
    effects.push({
      systemId: dep.to,
      effect: changeDirection === 'improve' ? 'positive' : 'negative',
      strength: dep.strength
    });
  }
  
  return effects;
}
