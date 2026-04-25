// ICD-11 Disease Code Mappings
// Reference: https://icd.who.int/

export interface ICD11Code {
  code: string;
  title: string;
  titleVi: string;
  chapter: string;
  category: string;
}

// Common infectious diseases with ICD-11 codes
export const ICD11_CODES: Record<string, ICD11Code> = {
  // Dengue - Chapter 01: Certain infectious or parasitic diseases
  'dengue': {
    code: '1D2Z',
    title: 'Dengue fever',
    titleVi: 'Sốt xuất huyết Dengue',
    chapter: '01',
    category: 'Viral infections characterised by skin or mucous membrane lesions'
  },
  'dengue_hemorrhagic': {
    code: '1D20',
    title: 'Dengue haemorrhagic fever',
    titleVi: 'Sốt xuất huyết Dengue có biến chứng',
    chapter: '01',
    category: 'Viral infections characterised by skin or mucous membrane lesions'
  },
  
  // COVID-19
  'covid19': {
    code: 'RA01',
    title: 'COVID-19',
    titleVi: 'COVID-19',
    chapter: '01',
    category: 'Codes for special purposes'
  },
  
  // Hand, Foot and Mouth Disease
  'hfmd': {
    code: '1F05.0',
    title: 'Hand, foot and mouth disease',
    titleVi: 'Bệnh tay chân miệng',
    chapter: '01',
    category: 'Enteroviral infections'
  },
  
  // Malaria
  'malaria': {
    code: '1F40',
    title: 'Malaria',
    titleVi: 'Sốt rét',
    chapter: '01',
    category: 'Diseases due to protozoans'
  },
  
  // Cholera
  'cholera': {
    code: '1A00',
    title: 'Cholera',
    titleVi: 'Tả',
    chapter: '01',
    category: 'Gastroenteritis or colitis of infectious origin'
  },
  
  // Typhoid
  'typhoid': {
    code: '1A01',
    title: 'Typhoid fever',
    titleVi: 'Thương hàn',
    chapter: '01',
    category: 'Bacterial intestinal infections'
  },
  
  // Hepatitis
  'hepatitis_a': {
    code: '1E50.0',
    title: 'Acute hepatitis A',
    titleVi: 'Viêm gan A cấp',
    chapter: '01',
    category: 'Acute viral hepatitis'
  },
  'hepatitis_b': {
    code: '1E50.1',
    title: 'Acute hepatitis B',
    titleVi: 'Viêm gan B cấp',
    chapter: '01',
    category: 'Acute viral hepatitis'
  },
  
  // Tuberculosis
  'tuberculosis': {
    code: '1B10',
    title: 'Tuberculosis of lung',
    titleVi: 'Lao phổi',
    chapter: '01',
    category: 'Mycobacterial diseases'
  },
  
  // Influenza
  'influenza': {
    code: '1E30',
    title: 'Influenza',
    titleVi: 'Cúm',
    chapter: '01',
    category: 'Influenza'
  },
  
  // Measles
  'measles': {
    code: '1F03',
    title: 'Measles',
    titleVi: 'Sởi',
    chapter: '01',
    category: 'Paramyxoviral diseases'
  },
  
  // Zika
  'zika': {
    code: '1D47',
    title: 'Zika virus disease',
    titleVi: 'Bệnh do virus Zika',
    chapter: '01',
    category: 'Arboviral diseases'
  },
  
  // Chikungunya
  'chikungunya': {
    code: '1D43',
    title: 'Chikungunya virus disease',
    titleVi: 'Bệnh Chikungunya',
    chapter: '01',
    category: 'Arboviral diseases'
  },
  
  // Stroke (for stroke risk module)
  'stroke_ischemic': {
    code: '8B11',
    title: 'Ischaemic stroke',
    titleVi: 'Đột quỵ thiếu máu cục bộ',
    chapter: '08',
    category: 'Cerebrovascular diseases'
  },
  'stroke_hemorrhagic': {
    code: '8B00',
    title: 'Intracerebral haemorrhage',
    titleVi: 'Xuất huyết não',
    chapter: '08',
    category: 'Cerebrovascular diseases'
  }
};

// Convert legacy disease codes to ICD-11
export const convertToICD11 = (legacyCode: string): ICD11Code | null => {
  const normalizedCode = legacyCode.toLowerCase().replace(/[-_\s]/g, '');
  
  // Direct mapping
  if (ICD11_CODES[normalizedCode]) {
    return ICD11_CODES[normalizedCode];
  }
  
  // Fuzzy matching for common variations
  const mappings: Record<string, string> = {
    'd01': 'dengue',
    'd02': 'covid19',
    'd03': 'hfmd',
    'd04': 'malaria',
    'tcm': 'hfmd',
    'sxh': 'dengue',
    'sot_ret': 'malaria',
    'cum': 'influenza',
    'soi': 'measles',
    'ta': 'cholera',
    'thuonghan': 'typhoid'
  };
  
  const mapped = mappings[normalizedCode];
  if (mapped && ICD11_CODES[mapped]) {
    return ICD11_CODES[mapped];
  }
  
  return null;
};

// Get ICD-11 display text
export const getICD11Display = (code: string, language: 'en' | 'vi' = 'en'): string => {
  const icd = convertToICD11(code) || ICD11_CODES[code.toLowerCase()];
  if (!icd) return code.toUpperCase();
  
  const title = language === 'vi' ? icd.titleVi : icd.title;
  return `${icd.code} - ${title}`;
};

// Get short display (code only)
export const getICD11Code = (legacyCode: string): string => {
  const icd = convertToICD11(legacyCode);
  return icd ? icd.code : legacyCode.toUpperCase();
};

// Search ICD-11 codes
export const searchICD11 = (query: string): ICD11Code[] => {
  const normalizedQuery = query.toLowerCase();
  return Object.values(ICD11_CODES).filter(
    icd => 
      icd.code.toLowerCase().includes(normalizedQuery) ||
      icd.title.toLowerCase().includes(normalizedQuery) ||
      icd.titleVi.toLowerCase().includes(normalizedQuery)
  );
};
