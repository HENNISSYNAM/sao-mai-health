/**
 * Centralized Disease Naming System
 * 
 * Rules:
 * - disease_code is the ONLY internal identifier (language-independent)
 * - display names are determined by current language context
 * - NEVER mix English and Vietnamese in UI
 * - NEVER show disease_code directly to users
 */

export const DISEASE_CODES = {
  DENGUE: 'dengue',
  COVID19: 'covid19',
  HFMD: 'hfmd',
  INFLUENZA: 'influenza',
  ARI: 'ari',
  MALARIA: 'malaria',
  CHOLERA: 'cholera',
  TYPHOID: 'typhoid',
  HEPATITIS: 'hepatitis',
  TUBERCULOSIS: 'tuberculosis',
  MEASLES: 'measles',
  FLU: 'flu',
  FOOD_POISONING: 'food_poisoning',
  DIARRHEA: 'diarrhea',
  STROKE_RISK: 'stroke_risk',
  UNKNOWN: 'unknown'
} as const;

export type DiseaseCode = typeof DISEASE_CODES[keyof typeof DISEASE_CODES];

interface DiseaseTranslation {
  vi: string;
  en: string;
}

// Official disease name mapping - SINGLE SOURCE OF TRUTH
const DISEASE_TRANSLATIONS: Record<string, DiseaseTranslation> = {
  dengue: {
    vi: 'Sốt xuất huyết',
    en: 'Dengue Fever'
  },
  covid19: {
    vi: 'COVID-19',
    en: 'COVID-19'
  },
  covid: {
    vi: 'COVID-19',
    en: 'COVID-19'
  },
  hfmd: {
    vi: 'Tay chân miệng',
    en: 'Hand, Foot & Mouth Disease'
  },
  hand_foot_mouth: {
    vi: 'Tay chân miệng',
    en: 'Hand, Foot & Mouth Disease'
  },
  tcm: {
    vi: 'Tay chân miệng',
    en: 'Hand, Foot & Mouth Disease'
  },
  influenza: {
    vi: 'Cúm',
    en: 'Influenza'
  },
  flu: {
    vi: 'Cúm',
    en: 'Flu'
  },
  ari: {
    vi: 'Nhiễm trùng hô hấp cấp',
    en: 'Acute Respiratory Infection'
  },
  malaria: {
    vi: 'Sốt rét',
    en: 'Malaria'
  },
  cholera: {
    vi: 'Tả',
    en: 'Cholera'
  },
  typhoid: {
    vi: 'Thương hàn',
    en: 'Typhoid'
  },
  hepatitis: {
    vi: 'Viêm gan',
    en: 'Hepatitis'
  },
  tuberculosis: {
    vi: 'Lao phổi',
    en: 'Tuberculosis'
  },
  measles: {
    vi: 'Sởi',
    en: 'Measles'
  },
  food_poisoning: {
    vi: 'Ngộ độc thực phẩm',
    en: 'Food Poisoning'
  },
  diarrhea: {
    vi: 'Tiêu chảy',
    en: 'Diarrhea'
  },
  stroke_risk: {
    vi: 'Nguy cơ đột quỵ',
    en: 'Stroke Risk'
  },
  unknown: {
    vi: 'Không xác định',
    en: 'Unknown'
  }
};

/**
 * Get localized disease name from disease_code
 * @param diseaseCode - Internal disease identifier
 * @param language - 'vi' | 'en'
 * @returns Localized display name (NEVER returns disease_code)
 */
export function getDiseaseName(diseaseCode: string, language: 'vi' | 'en' = 'vi'): string {
  const normalizedCode = diseaseCode?.toLowerCase().trim();
  const translation = DISEASE_TRANSLATIONS[normalizedCode];
  
  if (translation) {
    return translation[language];
  }
  
  // Fallback: return the unknown translation, NEVER the raw code
  return DISEASE_TRANSLATIONS.unknown[language];
}

/**
 * Get disease color for charts (consistent across languages)
 */
export function getDiseaseColor(diseaseCode: string): { solid: string; faded: string } {
  const normalizedCode = diseaseCode?.toLowerCase().trim();
  
  const colors: Record<string, { solid: string; faded: string }> = {
    dengue: { solid: 'hsl(var(--chart-1))', faded: 'hsl(var(--chart-1) / 0.3)' },
    covid19: { solid: 'hsl(var(--chart-2))', faded: 'hsl(var(--chart-2) / 0.3)' },
    covid: { solid: 'hsl(var(--chart-2))', faded: 'hsl(var(--chart-2) / 0.3)' },
    hfmd: { solid: 'hsl(var(--chart-3))', faded: 'hsl(var(--chart-3) / 0.3)' },
    influenza: { solid: 'hsl(var(--chart-4))', faded: 'hsl(var(--chart-4) / 0.3)' },
    ari: { solid: 'hsl(var(--chart-5))', faded: 'hsl(var(--chart-5) / 0.3)' }
  };
  
  return colors[normalizedCode] || { solid: 'hsl(var(--chart-1))', faded: 'hsl(var(--chart-1) / 0.3)' };
}

/**
 * Normalize disease code from various input formats
 */
export function normalizeDiseaseCode(input: string): string {
  const normalized = input?.toLowerCase().trim();
  
  // Map common variations to standard codes
  const aliases: Record<string, string> = {
    'sốt xuất huyết': 'dengue',
    'sxh': 'dengue',
    'tay chân miệng': 'hfmd',
    'tcm': 'hfmd',
    'cúm': 'influenza',
    'covid': 'covid19',
    'corona': 'covid19'
  };
  
  return aliases[normalized] || normalized || 'unknown';
}
