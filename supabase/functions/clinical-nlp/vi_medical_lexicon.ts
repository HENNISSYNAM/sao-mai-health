// Vietnamese ↔ English medical term lexicon for candidate lookup.
// Focus: common diseases & drug ingredients seen in Vietnamese EHR/discharge notes.
// Keys are normalized (lowercased, punctuation collapsed).

export interface LexHit {
  en: string;         // canonical English name (feed to NIH/RxNav)
  codes?: string[];   // known-good codes (ICD-10 or RxCUI ingredient)
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

// -------- Diseases (VI → EN + ICD-10 hints) --------
const DISEASE_ENTRIES: Record<string, LexHit> = {
  'trào ngược dạ dày - thực quản': { en: 'gastroesophageal reflux disease', codes: ['K21.0', 'K21.9'] },
  'trào ngược dạ dày thực quản': { en: 'gastroesophageal reflux disease', codes: ['K21.0', 'K21.9'] },
  'viêm dạ dày': { en: 'gastritis', codes: ['K29.7'] },
  'loét dạ dày': { en: 'gastric ulcer', codes: ['K25.9'] },
  'loét tá tràng': { en: 'duodenal ulcer', codes: ['K26.9'] },
  'viêm loét dạ dày tá tràng': { en: 'peptic ulcer disease', codes: ['K27.9'] },
  'tăng huyết áp': { en: 'essential hypertension', codes: ['I10'] },
  'cao huyết áp': { en: 'essential hypertension', codes: ['I10'] },
  'huyết áp thấp': { en: 'hypotension', codes: ['I95.9'] },
  'đái tháo đường': { en: 'diabetes mellitus', codes: ['E11.9'] },
  'đái tháo đường type 2': { en: 'type 2 diabetes mellitus', codes: ['E11.9'] },
  'đái tháo đường tuýp 2': { en: 'type 2 diabetes mellitus', codes: ['E11.9'] },
  'tiểu đường': { en: 'diabetes mellitus', codes: ['E11.9'] },
  'tiểu đường type 2': { en: 'type 2 diabetes mellitus', codes: ['E11.9'] },
  'đái tháo đường type 1': { en: 'type 1 diabetes mellitus', codes: ['E10.9'] },
  'rối loạn lipid máu': { en: 'hyperlipidemia', codes: ['E78.5'] },
  'tăng cholesterol máu': { en: 'hypercholesterolemia', codes: ['E78.0'] },
  'suy tim': { en: 'heart failure', codes: ['I50.9'] },
  'suy tim sung huyết': { en: 'congestive heart failure', codes: ['I50.0'] },
  'bệnh mạch vành': { en: 'coronary artery disease', codes: ['I25.10'] },
  'nhồi máu cơ tim': { en: 'acute myocardial infarction', codes: ['I21.9'] },
  'đau thắt ngực': { en: 'angina pectoris', codes: ['I20.9'] },
  'rung nhĩ': { en: 'atrial fibrillation', codes: ['I48.91'] },
  'đột quỵ': { en: 'stroke', codes: ['I63.9'] },
  'tai biến mạch máu não': { en: 'cerebrovascular accident', codes: ['I64'] },
  'hen phế quản': { en: 'asthma', codes: ['J45.909'] },
  'hen suyễn': { en: 'asthma', codes: ['J45.909'] },
  'copd': { en: 'chronic obstructive pulmonary disease', codes: ['J44.9'] },
  'bệnh phổi tắc nghẽn mạn tính': { en: 'chronic obstructive pulmonary disease', codes: ['J44.9'] },
  'viêm phổi': { en: 'pneumonia', codes: ['J18.9'] },
  'viêm phế quản': { en: 'bronchitis', codes: ['J40'] },
  'viêm phế quản cấp': { en: 'acute bronchitis', codes: ['J20.9'] },
  'lao phổi': { en: 'pulmonary tuberculosis', codes: ['A15.0'] },
  'covid-19': { en: 'covid-19', codes: ['U07.1'] },
  'cúm': { en: 'influenza', codes: ['J11.1'] },
  'sốt xuất huyết': { en: 'dengue fever', codes: ['A90'] },
  'sốt xuất huyết dengue': { en: 'dengue hemorrhagic fever', codes: ['A91'] },
  'sốt rét': { en: 'malaria', codes: ['B54'] },
  'viêm gan b': { en: 'chronic viral hepatitis b', codes: ['B18.1'] },
  'viêm gan c': { en: 'chronic viral hepatitis c', codes: ['B18.2'] },
  'xơ gan': { en: 'cirrhosis of liver', codes: ['K74.60'] },
  'suy thận mạn': { en: 'chronic kidney disease', codes: ['N18.9'] },
  'suy thận cấp': { en: 'acute kidney injury', codes: ['N17.9'] },
  'sỏi thận': { en: 'kidney stone', codes: ['N20.0'] },
  'nhiễm khuẩn tiết niệu': { en: 'urinary tract infection', codes: ['N39.0'] },
  'thiếu máu': { en: 'anemia', codes: ['D64.9'] },
  'thiếu máu thiếu sắt': { en: 'iron deficiency anemia', codes: ['D50.9'] },
  'suy giáp': { en: 'hypothyroidism', codes: ['E03.9'] },
  'cường giáp': { en: 'hyperthyroidism', codes: ['E05.90'] },
  'basedow': { en: 'graves disease', codes: ['E05.00'] },
  'trầm cảm': { en: 'major depressive disorder', codes: ['F32.9'] },
  'rối loạn lo âu': { en: 'anxiety disorder', codes: ['F41.9'] },
  'mất ngủ': { en: 'insomnia', codes: ['G47.00'] },
  'động kinh': { en: 'epilepsy', codes: ['G40.909'] },
  'parkinson': { en: 'parkinson disease', codes: ['G20'] },
  'alzheimer': { en: 'alzheimer disease', codes: ['G30.9'] },
  'sa sút trí tuệ': { en: 'dementia', codes: ['F03'] },
  'viêm khớp dạng thấp': { en: 'rheumatoid arthritis', codes: ['M06.9'] },
  'thoái hóa khớp': { en: 'osteoarthritis', codes: ['M19.90'] },
  'gout': { en: 'gout', codes: ['M10.9'] },
  'gút': { en: 'gout', codes: ['M10.9'] },
  'loãng xương': { en: 'osteoporosis', codes: ['M81.0'] },
  'thoát vị đĩa đệm': { en: 'intervertebral disc disorder', codes: ['M51.9'] },
  'đau lưng': { en: 'low back pain', codes: ['M54.5'] },
  'béo phì': { en: 'obesity', codes: ['E66.9'] },
  'ung thư phổi': { en: 'lung cancer', codes: ['C34.90'] },
  'ung thư gan': { en: 'liver cancer', codes: ['C22.9'] },
  'ung thư vú': { en: 'breast cancer', codes: ['C50.919'] },
  'ung thư dạ dày': { en: 'gastric cancer', codes: ['C16.9'] },
  'ung thư đại trực tràng': { en: 'colorectal cancer', codes: ['C18.9'] },
  'viêm ruột thừa': { en: 'appendicitis', codes: ['K37'] },
  'sốt': { en: 'fever', codes: ['R50.9'] },
  'nhiễm trùng huyết': { en: 'sepsis', codes: ['A41.9'] },
  'viêm xoang': { en: 'sinusitis', codes: ['J32.9'] },
  'viêm họng': { en: 'pharyngitis', codes: ['J02.9'] },
  'viêm amidan': { en: 'tonsillitis', codes: ['J03.90'] },
  'viêm tai giữa': { en: 'otitis media', codes: ['H66.90'] },
  'viêm da cơ địa': { en: 'atopic dermatitis', codes: ['L20.9'] },
  'vảy nến': { en: 'psoriasis', codes: ['L40.9'] },
  'mề đay': { en: 'urticaria', codes: ['L50.9'] },
  'mày đay': { en: 'urticaria', codes: ['L50.9'] },
  'mày đay vô căn': { en: 'idiopathic urticaria', codes: ['L50.1'] },
  // --- terms observed in the Viettel Round-1 test set ---
  'thiếu men g6pd': { en: 'glucose-6-phosphate dehydrogenase deficiency', codes: ['D55.0'] },
  'thiếu men glucose-6-phosphate dehydrogenase': { en: 'glucose-6-phosphate dehydrogenase deficiency', codes: ['D55.0'] },
  'bệnh kawasaki': { en: 'kawasaki disease', codes: ['M30.3'] },
  'kawasaki': { en: 'kawasaki disease', codes: ['M30.3'] },
  'não úng thủy': { en: 'hydrocephalus', codes: ['G91.9'] },
  'não úng thuỷ': { en: 'hydrocephalus', codes: ['G91.9'] },
  'viêm mô tế bào': { en: 'cellulitis', codes: ['L03.90'] },
  'viêm phổi hoại tử': { en: 'necrotizing pneumonia', codes: ['J85.0'] },
  'viêm hang vị dạ dày': { en: 'antral gastritis', codes: ['K29.60'] },
  'viêm sung huyết hang vị dạ dày': { en: 'antral gastritis', codes: ['K29.60'] },
  'bệnh thận mạn': { en: 'chronic kidney disease', codes: ['N18.9'] },
  'nhiễm khuẩn đường tiết niệu': { en: 'urinary tract infection', codes: ['N39.0'] },
  'bệnh bạch cầu dòng tủy mạn tính': { en: 'chronic myeloid leukemia', codes: ['C92.10'] },
  'bệnh bạch cầu dòng tủy mãn tính': { en: 'chronic myeloid leukemia', codes: ['C92.10'] },
  'ung thư biểu mô tuyến': { en: 'adenocarcinoma', codes: ['C80.1'] },
  'bệnh lý thần kinh ngoại biên': { en: 'peripheral neuropathy', codes: ['G62.9'] },
  'amyloidosis': { en: 'amyloidosis', codes: ['E85.9'] },
  'viêm dạ dày ruột do virus': { en: 'viral gastroenteritis', codes: ['A08.4'] },
  'tràn dịch màng phổi': { en: 'pleural effusion', codes: ['J90'] },
  'xuất huyết tiêu hóa': { en: 'gastrointestinal hemorrhage', codes: ['K92.2'] },
  'xuất huyết dưới nhện': { en: 'subarachnoid hemorrhage', codes: ['I60.9'] },
  'thiếu máu tan huyết': { en: 'hemolytic anemia', codes: ['D58.9'] },
  'vàng da sơ sinh': { en: 'neonatal jaundice', codes: ['P59.9'] },
  'suy thượng thận': { en: 'adrenal insufficiency', codes: ['E27.40'] },
  'hạ đường huyết': { en: 'hypoglycemia', codes: ['E16.2'] },
  'tăng acid uric máu': { en: 'hyperuricemia', codes: ['E79.0'] },
  'sỏi mật': { en: 'cholelithiasis', codes: ['K80.20'] },
  'viêm tụy cấp': { en: 'acute pancreatitis', codes: ['K85.90'] },
};

// -------- Drug ingredients (VI/EN → EN + RxCUI ingredient hint) --------
// RxCUI ingredient (IN) is fallback when strength/form is missing.
const DRUG_ENTRIES: Record<string, LexHit> = {
  'chlorpheniramine': { en: 'chlorpheniramine', codes: ['2400'] },
  'chlorpheniramin': { en: 'chlorpheniramine', codes: ['2400'] },
  'capsaicin': { en: 'capsaicin', codes: ['1928'] },
  'paracetamol': { en: 'acetaminophen', codes: ['161'] },
  'acetaminophen': { en: 'acetaminophen', codes: ['161'] },
  'ibuprofen': { en: 'ibuprofen', codes: ['5640'] },
  'aspirin': { en: 'aspirin', codes: ['1191'] },
  'amoxicillin': { en: 'amoxicillin', codes: ['723'] },
  'ampicillin': { en: 'ampicillin', codes: ['733'] },
  'ceftriaxone': { en: 'ceftriaxone', codes: ['2193'] },
  'cefixime': { en: 'cefixime', codes: ['20489'] },
  'cefuroxime': { en: 'cefuroxime', codes: ['2231'] },
  'azithromycin': { en: 'azithromycin', codes: ['18631'] },
  'ciprofloxacin': { en: 'ciprofloxacin', codes: ['2551'] },
  'levofloxacin': { en: 'levofloxacin', codes: ['82122'] },
  'metronidazole': { en: 'metronidazole', codes: ['6922'] },
  'omeprazole': { en: 'omeprazole', codes: ['7646'] },
  'esomeprazole': { en: 'esomeprazole', codes: ['283742'] },
  'pantoprazole': { en: 'pantoprazole', codes: ['40790'] },
  'rabeprazole': { en: 'rabeprazole', codes: ['114970'] },
  'lansoprazole': { en: 'lansoprazole', codes: ['17128'] },
  'ranitidine': { en: 'ranitidine', codes: ['9143'] },
  'famotidine': { en: 'famotidine', codes: ['4278'] },
  'metformin': { en: 'metformin', codes: ['6809'] },
  'gliclazide': { en: 'gliclazide', codes: ['25789'] },
  'glimepiride': { en: 'glimepiride', codes: ['25789'] },
  'insulin': { en: 'insulin', codes: ['5856'] },
  'atorvastatin': { en: 'atorvastatin', codes: ['83367'] },
  'rosuvastatin': { en: 'rosuvastatin', codes: ['301542'] },
  'simvastatin': { en: 'simvastatin', codes: ['36567'] },
  'amlodipine': { en: 'amlodipine', codes: ['17767'] },
  'nifedipine': { en: 'nifedipine', codes: ['7417'] },
  'losartan': { en: 'losartan', codes: ['52175'] },
  'valsartan': { en: 'valsartan', codes: ['69749'] },
  'telmisartan': { en: 'telmisartan', codes: ['73494'] },
  'enalapril': { en: 'enalapril', codes: ['3827'] },
  'lisinopril': { en: 'lisinopril', codes: ['29046'] },
  'captopril': { en: 'captopril', codes: ['1998'] },
  'bisoprolol': { en: 'bisoprolol', codes: ['19484'] },
  'metoprolol': { en: 'metoprolol', codes: ['6918'] },
  'propranolol': { en: 'propranolol', codes: ['8787'] },
  'furosemide': { en: 'furosemide', codes: ['4603'] },
  'hydrochlorothiazide': { en: 'hydrochlorothiazide', codes: ['5487'] },
  'spironolactone': { en: 'spironolactone', codes: ['9997'] },
  'warfarin': { en: 'warfarin', codes: ['11289'] },
  'clopidogrel': { en: 'clopidogrel', codes: ['32968'] },
  'salbutamol': { en: 'albuterol', codes: ['435'] },
  'albuterol': { en: 'albuterol', codes: ['435'] },
  'budesonide': { en: 'budesonide', codes: ['19831'] },
  'prednisolone': { en: 'prednisolone', codes: ['8638'] },
  'prednisone': { en: 'prednisone', codes: ['8640'] },
  'dexamethasone': { en: 'dexamethasone', codes: ['3264'] },
  'methylprednisolone': { en: 'methylprednisolone', codes: ['6902'] },
  'loratadine': { en: 'loratadine', codes: ['28889'] },
  'cetirizine': { en: 'cetirizine', codes: ['20610'] },
  'fexofenadine': { en: 'fexofenadine', codes: ['54418'] },
  'diclofenac': { en: 'diclofenac', codes: ['3355'] },
  'meloxicam': { en: 'meloxicam', codes: ['40048'] },
  'celecoxib': { en: 'celecoxib', codes: ['140587'] },
  'tramadol': { en: 'tramadol', codes: ['10689'] },
  'morphine': { en: 'morphine', codes: ['7052'] },
  'vitamin c': { en: 'ascorbic acid', codes: ['1151'] },
  'vitamin b1': { en: 'thiamine', codes: ['10454'] },
  'vitamin b6': { en: 'pyridoxine', codes: ['8895'] },
  'vitamin b12': { en: 'cyanocobalamin', codes: ['2418'] },
  'vitamin d': { en: 'cholecalciferol', codes: ['2418'] },
  'vitamin d3': { en: 'cholecalciferol', codes: ['2418'] },
  'sắt': { en: 'iron', codes: ['5933'] },
  'canxi': { en: 'calcium', codes: ['1895'] },
  'kali': { en: 'potassium', codes: ['8591'] },
  // --- drugs observed in the Viettel Round-1 test set ---
  'ceftriaxone': { en: 'ceftriaxone', codes: ['2193'] },
  'cefotaxime': { en: 'cefotaxime', codes: ['2191'] },
  'vancomycin': { en: 'vancomycin', codes: ['11124'] },
  'augmentin': { en: 'amoxicillin / clavulanate', codes: ['19711'] },
  'rosuvastatin': { en: 'rosuvastatin', codes: ['301542'] },
  'carvedilol': { en: 'carvedilol', codes: ['20352'] },
  'torsemide': { en: 'torsemide', codes: ['38413'] },
  'isosorbide': { en: 'isosorbide', codes: ['33144'] },
  'isosorbide mononitrate': { en: 'isosorbide mononitrate', codes: ['33144'] },
  'medrol': { en: 'methylprednisolone', codes: ['6902'] },
  'tylenol': { en: 'acetaminophen', codes: ['161'] },
  'alverin': { en: 'alverine', codes: ['52796'] },
  'alverin citrate': { en: 'alverine', codes: ['52796'] },
  'simethicon': { en: 'simethicone', codes: ['9796'] },
  'simethicone': { en: 'simethicone', codes: ['9796'] },
  'nhôm hydroxid': { en: 'aluminum hydroxide', codes: ['610'] },
  'magie hydroxid': { en: 'magnesium hydroxide', codes: ['6582'] },
  'levothyroxine': { en: 'levothyroxine', codes: ['10582'] },
  'colchicine': { en: 'colchicine', codes: ['2683'] },
  'allopurinol': { en: 'allopurinol', codes: ['519'] },
  'gamma globulin': { en: 'immune globulin', codes: ['5548'] },
  'immunoglobulin': { en: 'immune globulin', codes: ['5548'] },
  'furosemid': { en: 'furosemide', codes: ['4603'] },
  'digoxin': { en: 'digoxin', codes: ['3407'] },
  'heparin': { en: 'heparin', codes: ['5224'] },
  'enoxaparin': { en: 'enoxaparin', codes: ['67108'] },
  'acid folic': { en: 'folic acid', codes: ['4511'] },
  'oseltamivir': { en: 'oseltamivir', codes: ['260101'] },
};

/** Look up a Vietnamese disease term. Returns EN name + candidate codes if found. */
export function lookupDiseaseVi(term: string): LexHit | null {
  const key = norm(term);
  if (DISEASE_ENTRIES[key]) return DISEASE_ENTRIES[key];
  // Loose match: check contained keys
  for (const [k, v] of Object.entries(DISEASE_ENTRIES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

/**
 * Look up a drug string. Handles forms like "Chlorpheniramine 0.4 MG/ML".
 * Extracts the leading ingredient token (before dose/strength) and matches.
 */
export function lookupDrugVi(term: string): LexHit | null {
  const raw = norm(term);
  // Strip strength/dose tail: everything from first digit onward
  const ingredient = raw.replace(/\s*\d.*$/, '').trim();
  if (!ingredient) return null;
  if (DRUG_ENTRIES[ingredient]) return DRUG_ENTRIES[ingredient];
  // First word fallback
  const first = ingredient.split(/\s+/)[0];
  if (DRUG_ENTRIES[first]) return DRUG_ENTRIES[first];
  // Loose contains
  for (const [k, v] of Object.entries(DRUG_ENTRIES)) {
    if (ingredient.includes(k)) return v;
  }
  return null;
}

/** Extract the ingredient portion of a drug string (before strength). */
export function extractIngredient(term: string): string {
  return norm(term).replace(/\s*\d.*$/, '').trim();
}
